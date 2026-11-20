import type { Lang, MeaningUnit, Probe, Subject } from "@/lib/types";
import { date, idea, name, num, qty } from "./units";

/**
 * Procedural generator for detail-dense "information retention" passages.
 * Templates are bilingual; slot values are randomised from a seed so every
 * exercise is new but reproducible.
 */

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: Rng, items: T[]): T => items[Math.floor(rng() * items.length)];
const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

const FIRST = ["Laura", "Daniel", "Amara", "Tomás", "Priya", "Jonas", "Elena", "Samuel", "Nadia", "Rafael", "Grace", "Iker"];
const LAST = ["Méndez", "Kovac", "Osei", "Herrera", "Raman", "Berg", "Castillo", "Novak", "Okonkwo", "Lindqvist", "Ibarra", "Tanaka"];
const CITIES = ["Valencia", "Rosario", "Toronto", "Cebu", "Leeds", "Medellín", "Porto", "Tucson", "Cusco", "Gdansk"];
const COMPANIES = ["Norvia", "Altamar", "Kestrel Labs", "Quantis", "Brightwell", "Solenne", "Tavira Group", "Orbis"];

const MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
};

const WEEKDAYS: Record<Lang, string[]> = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  es: ["lunes", "martes", "miércoles", "jueves", "viernes"],
};

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function fmtNumber(n: number, lang: Lang) {
  return n.toLocaleString(lang === "en" ? "en-US" : "es-ES", { maximumFractionDigits: 2 });
}

function fmtDate(day: number, month: number, lang: Lang) {
  return lang === "en" ? `${MONTHS.en[month]} ${day}` : `${day} de ${MONTHS.es[month]}`;
}

function dateCues(day: number, month: number) {
  return {
    en: `${strip(MONTHS.en[month])} ${day}|${day} ${strip(MONTHS.en[month])}`,
    es: `${day} ${strip(MONTHS.es[month])}`,
  };
}

interface GenSegment {
  en: string;
  es: string;
  units: MeaningUnit[];
  probes: Probe[];
}

type Template = (rng: Rng, k: string) => GenSegment;

function person(rng: Rng) {
  const first = pick(rng, FIRST);
  const last = pick(rng, LAST);
  return { full: `${first} ${last}`, cue: strip(last) };
}

const TEMPLATES: Record<Subject, Template[]> = {
  medical: [
    (rng, k) => {
      const p = person(rng);
      const age = int(rng, 24, 88);
      const d = int(rng, 1, 28);
      const m = int(rng, 0, 11);
      return {
        en: `${p.full}, aged ${age}, was admitted on ${fmtDate(d, m, "en")} with shortness of breath.`,
        es: `${p.full}, de ${age} años, ingresó el ${fmtDate(d, m, "es")} con dificultad para respirar.`,
        units: [
          name(`${k}a`, `Patient: ${p.full}`, p.cue, 3),
          num(`${k}b`, `Age ${age}`, age, 2, "age|year|old", "ano|edad"),
          date(`${k}c`, `Admitted ${fmtDate(d, m, "en")}`, dateCues(d, m).en, dateCues(d, m).es, 3),
          idea(`${k}d`, "Shortness of breath", "breath", "respir|ahog|disnea", 2),
        ],
        probes: [
          { unitId: `${k}b`, question: { en: "How old is the patient?", es: "¿Qué edad tiene el paciente?" } },
          { unitId: `${k}c`, question: { en: "On what date was the patient admitted?", es: "¿Qué día ingresó el paciente?" } },
        ],
      };
    },
    (rng, k) => {
      const dose = pick(rng, [5, 10, 20, 25, 40, 50, 250, 500]);
      const times = int(rng, 2, 4);
      const days = pick(rng, [5, 7, 10, 14, 21]);
      const drug = pick(rng, ["metformin", "lisinopril", "atorvastatin", "prednisone", "cephalexin"]);
      const drugEs = { metformin: "metformina", lisinopril: "lisinopril", atorvastatin: "atorvastatina", prednisone: "prednisona", cephalexin: "cefalexina" }[drug]!;
      return {
        en: `She was prescribed ${drug}, ${dose} milligrams ${times} times a day, for ${days} days.`,
        es: `Se le recetó ${drugEs}, ${dose} miligramos ${times} veces al día, durante ${days} días.`,
        units: [
          { id: `${k}a`, category: "term", label: `Drug: ${drug}`, weight: 3, cues: { en: drug.slice(0, 6), es: strip(drugEs).slice(0, 6) } },
          qty(`${k}b`, `${dose} mg`, dose, 3, "milligram|mg", "miligram|mg"),
          qty(`${k}c`, `${times} times a day`, times, 3, "time|day", "vece|dia"),
          num(`${k}d`, `For ${days} days`, days, 3, "day", "dia"),
        ],
        probes: [
          { unitId: `${k}b`, question: { en: "What was the dose in milligrams?", es: "¿Cuál era la dosis en miligramos?" } },
          { unitId: `${k}d`, question: { en: "For how many days?", es: "¿Durante cuántos días?" } },
        ],
      };
    },
    (rng, k) => {
      const sys = int(rng, 135, 185);
      const dia = int(rng, 85, 110);
      const hr = int(rng, 88, 132);
      return {
        en: `On arrival her blood pressure was ${sys} over ${dia} and her heart rate was ${hr} beats per minute.`,
        es: `A su llegada, la presión arterial era de ${sys} sobre ${dia} y la frecuencia cardiaca de ${hr} latidos por minuto.`,
        units: [
          num(`${k}a`, `Systolic ${sys}`, sys, 3, "pressure", "presion|tension"),
          num(`${k}b`, `Diastolic ${dia}`, dia, 3, "pressure", "presion|tension"),
          num(`${k}c`, `Heart rate ${hr}`, hr, 3, "heart|pulse|beat", "frecuencia|pulso|latido"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "What was the systolic blood pressure?", es: "¿Cuál era la presión sistólica?" } },
          { unitId: `${k}c`, question: { en: "What was the heart rate?", es: "¿Cuál era la frecuencia cardiaca?" } },
        ],
      };
    },
    (rng, k) => {
      const room = int(rng, 201, 548);
      const wd = int(rng, 0, 4);
      const hour = int(rng, 8, 11);
      return {
        en: `The follow-up is in room ${room} on ${WEEKDAYS.en[wd]} at ${hour} a.m., and she must fast for 8 hours before.`,
        es: `La cita de control es en la sala ${room} el ${WEEKDAYS.es[wd]} a las ${hour} de la mañana, y debe estar en ayunas 8 horas antes.`,
        units: [
          num(`${k}a`, `Room ${room}`, room, 3, "room", "sala|habitac|consult"),
          date(`${k}b`, WEEKDAYS.en[wd], strip(WEEKDAYS.en[wd]), strip(WEEKDAYS.es[wd]), 3),
          num(`${k}c`, `At ${hour} a.m.`, hour, 2),
          qty(`${k}d`, "Fast for 8 hours", 8, 3, "fast|eat|hour", "ayun|comer|hora"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "Which room is the follow-up in?", es: "¿En qué sala es la cita de control?" } },
          { unitId: `${k}b`, question: { en: "On what day is the follow-up?", es: "¿Qué día es la cita de control?" } },
        ],
      };
    },
  ],
  legal: [
    (rng, k) => {
      const p = person(rng);
      const caseNo = int(rng, 1100, 9800);
      const d = int(rng, 1, 28);
      const m = int(rng, 0, 11);
      return {
        en: `In case number ${caseNo}, the defendant, ${p.full}, is scheduled to appear on ${fmtDate(d, m, "en")}.`,
        es: `En el caso número ${caseNo}, el acusado, ${p.full}, debe comparecer el ${fmtDate(d, m, "es")}.`,
        units: [
          num(`${k}a`, `Case ${caseNo}`, caseNo, 3, "case", "caso|expediente"),
          name(`${k}b`, `Defendant ${p.full}`, p.cue, 3),
          date(`${k}c`, `Appears ${fmtDate(d, m, "en")}`, dateCues(d, m).en, dateCues(d, m).es, 3),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "What is the case number?", es: "¿Cuál es el número del caso?" } },
          { unitId: `${k}b`, question: { en: "What is the defendant's surname?", es: "¿Cuál es el apellido del acusado?" } },
        ],
      };
    },
    (rng, k) => {
      const bail = pick(rng, [2500, 5000, 7500, 10000, 15000, 25000]);
      const days = pick(rng, [10, 14, 21, 30]);
      return {
        en: `Bail was set at ${fmtNumber(bail, "en")} dollars, and the defense has ${days} days to file a motion.`,
        es: `La fianza se fijó en ${fmtNumber(bail, "es")} dólares y la defensa tiene ${days} días para presentar una moción.`,
        units: [
          qty(`${k}a`, `Bail $${bail}`, bail, 3, "bail|bond", "fianza"),
          num(`${k}b`, `${days} days to file`, days, 3, "day", "dia"),
          idea(`${k}c`, "File a motion", "motion|file", "mocion|present|recurso", 2),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "How much was bail?", es: "¿A cuánto ascendió la fianza?" } },
          { unitId: `${k}b`, question: { en: "How many days does the defense have?", es: "¿Cuántos días tiene la defensa?" } },
        ],
      };
    },
    (rng, k) => {
      const w = person(rng);
      const city = pick(rng, CITIES);
      const hr = int(rng, 6, 11);
      const min = pick(rng, [10, 15, 20, 40, 45, 50]);
      return {
        en: `The witness, ${w.full}, stated she left ${city} at ${hr}:${min} p.m.`,
        es: `La testigo, ${w.full}, declaró que salió de ${city} a las ${hr}:${min} de la noche.`,
        units: [
          name(`${k}a`, `Witness ${w.full}`, w.cue, 3),
          name(`${k}b`, `Left ${city}`, strip(city), 3),
          num(`${k}c`, `At ${hr}:${min}`, Number(`${hr}.${String(min).padStart(2, "0")}`), 3),
        ],
        probes: [
          { unitId: `${k}b`, question: { en: "Which city did the witness leave?", es: "¿De qué ciudad salió la testigo?" } },
          { unitId: `${k}c`, question: { en: "At what time did she leave?", es: "¿A qué hora salió?" } },
        ],
      };
    },
  ],
  business: [
    (rng, k) => {
      const co = pick(rng, COMPANIES);
      const rev = int(rng, 12, 95) + pick(rng, [0, 0.2, 0.4, 0.5, 0.7]);
      const pct = int(rng, 3, 24);
      return {
        en: `${co} reported revenue of ${rev} million euros, up ${pct} percent year on year.`,
        es: `${co} declaró unos ingresos de ${String(rev).replace(".", ",")} millones de euros, un ${pct} por ciento más que el año anterior.`,
        units: [
          name(`${k}a`, `Company ${co}`, strip(co.split(" ")[0]), 3),
          qty(`${k}b`, `Revenue €${rev}M`, Math.round(rev * 1_000_000), 3, "revenue|sales", "ingreso|venta"),
          qty(`${k}c`, `Up ${pct}%`, pct, 3, "percent|%", "por ciento|%"),
        ],
        probes: [
          { unitId: `${k}b`, question: { en: "What revenue was reported (in millions)?", es: "¿Qué ingresos se declararon (en millones)?" } },
          { unitId: `${k}c`, question: { en: "By what percentage did revenue grow?", es: "¿En qué porcentaje crecieron los ingresos?" } },
        ],
      };
    },
    (rng, k) => {
      const staff = int(rng, 40, 480);
      const city = pick(rng, CITIES);
      const m = int(rng, 0, 11);
      const yr = pick(rng, [2027, 2028]);
      return {
        en: `A new office in ${city} will open in ${MONTHS.en[m]} ${yr} with ${staff} employees.`,
        es: `En ${MONTHS.es[m]} de ${yr} se abrirá una nueva oficina en ${city} con ${staff} empleados.`,
        units: [
          name(`${k}a`, `Office in ${city}`, strip(city), 3),
          date(`${k}b`, `${MONTHS.en[m]} ${yr}`, strip(MONTHS.en[m]), strip(MONTHS.es[m]), 2),
          num(`${k}c`, `Year ${yr}`, yr, 2),
          num(`${k}d`, `${staff} employees`, staff, 3, "employ|staff|people|worker", "emplead|trabajador|persona"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "Where will the new office open?", es: "¿Dónde se abrirá la nueva oficina?" } },
          { unitId: `${k}d`, question: { en: "How many employees will it have?", es: "¿Cuántos empleados tendrá?" } },
        ],
      };
    },
    (rng, k) => {
      const units = pick(rng, [8000, 12500, 20000, 35000, 60000]);
      const price = int(rng, 3, 48) + pick(rng, [0.5, 0.25, 0.75, 0]);
      return {
        en: `The order covers ${fmtNumber(units, "en")} units at ${price} dollars each, payable in 60 days.`,
        es: `El pedido incluye ${fmtNumber(units, "es")} unidades a ${String(price).replace(".", ",")} dólares cada una, pagaderas a 60 días.`,
        units: [
          qty(`${k}a`, `${units} units`, units, 3, "unit", "unidad"),
          qty(`${k}b`, `$${price} each`, price, 3, "dollar|each", "dolar|cada"),
          num(`${k}c`, "Payable in 60 days", 60, 2, "day", "dia"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "How many units were ordered?", es: "¿Cuántas unidades se pidieron?" } },
          { unitId: `${k}b`, question: { en: "What is the unit price?", es: "¿Cuál es el precio por unidad?" } },
        ],
      };
    },
  ],
  conference: [
    (rng, k) => {
      const countries = int(rng, 18, 64);
      const delegates = int(rng, 300, 1400);
      const city = pick(rng, CITIES);
      return {
        en: `This year ${fmtNumber(delegates, "en")} delegates from ${countries} countries have gathered in ${city}.`,
        es: `Este año se han reunido en ${city} ${fmtNumber(delegates, "es")} delegados de ${countries} países.`,
        units: [
          num(`${k}a`, `${delegates} delegates`, delegates, 3, "delegat|participant", "delegad|participant"),
          num(`${k}b`, `${countries} countries`, countries, 3, "countr|nation", "pais|nacion"),
          name(`${k}c`, `In ${city}`, strip(city), 3),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "How many delegates attended?", es: "¿Cuántos delegados asistieron?" } },
          { unitId: `${k}b`, question: { en: "From how many countries?", es: "¿De cuántos países?" } },
        ],
      };
    },
    (rng, k) => {
      const p = person(rng);
      const pct = int(rng, 15, 60);
      const yr = pick(rng, [2030, 2032, 2035, 2040]);
      return {
        en: `Minister ${p.full} pledged to cut emissions by ${pct} percent by ${yr}.`,
        es: `El ministro ${p.full} se comprometió a reducir las emisiones un ${pct} por ciento para ${yr}.`,
        units: [
          name(`${k}a`, `Minister ${p.full}`, p.cue, 3),
          idea(`${k}b`, "Cut emissions", "emission|carbon", "emision|carbono", 2),
          qty(`${k}c`, `${pct}%`, pct, 3, "percent|%", "por ciento|%"),
          num(`${k}d`, `By ${yr}`, yr, 3),
        ],
        probes: [
          { unitId: `${k}c`, question: { en: "By what percentage will emissions be cut?", es: "¿En qué porcentaje se reducirán las emisiones?" } },
          { unitId: `${k}d`, question: { en: "By what year?", es: "¿Para qué año?" } },
        ],
      };
    },
    (rng, k) => {
      const fund = pick(rng, [120, 250, 400, 750, 900]);
      const proj = int(rng, 12, 85);
      return {
        en: `A fund of ${fund} million dollars will finance ${proj} projects over the next 4 years.`,
        es: `Un fondo de ${fund} millones de dólares financiará ${proj} proyectos durante los próximos 4 años.`,
        units: [
          qty(`${k}a`, `Fund $${fund}M`, fund * 1_000_000, 3, "fund", "fondo"),
          num(`${k}b`, `${proj} projects`, proj, 3, "project", "proyecto"),
          num(`${k}c`, "Over 4 years", 4, 2, "year", "ano"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "How large is the fund?", es: "¿De cuánto es el fondo?" } },
          { unitId: `${k}b`, question: { en: "How many projects will it finance?", es: "¿Cuántos proyectos financiará?" } },
        ],
      };
    },
  ],
  technical: [
    (rng, k) => {
      const ver = `${int(rng, 2, 9)}.${int(rng, 0, 9)}`;
      const d = int(rng, 1, 28);
      const m = int(rng, 0, 11);
      return {
        en: `Version ${ver} of the firmware will be released on ${fmtDate(d, m, "en")}.`,
        es: `La versión ${ver.replace(".", ",")} del firmware se publicará el ${fmtDate(d, m, "es")}.`,
        units: [
          num(`${k}a`, `Version ${ver}`, Number(ver), 3, "version", "version"),
          idea(`${k}b`, "Firmware release", "firmware|software|release", "firmware|software|publica|lanza", 2),
          date(`${k}c`, `Released ${fmtDate(d, m, "en")}`, dateCues(d, m).en, dateCues(d, m).es, 3),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "Which version will be released?", es: "¿Qué versión se publicará?" } },
          { unitId: `${k}c`, question: { en: "On what date?", es: "¿En qué fecha?" } },
        ],
      };
    },
    (rng, k) => {
      const servers = int(rng, 12, 96);
      const ms = pick(rng, [120, 180, 250, 340, 450]);
      const pct = pick(rng, [99.5, 99.9, 99.95]);
      return {
        en: `We added ${servers} servers, latency dropped to ${ms} milliseconds, and uptime is now ${pct} percent.`,
        es: `Añadimos ${servers} servidores, la latencia bajó a ${ms} milisegundos y la disponibilidad es ahora del ${String(pct).replace(".", ",")} por ciento.`,
        units: [
          num(`${k}a`, `${servers} servers`, servers, 3, "server", "servidor"),
          qty(`${k}b`, `${ms} ms latency`, ms, 3, "latenc|millisecond|ms", "latencia|milisegundo|ms"),
          qty(`${k}c`, `${pct}% uptime`, pct, 3, "uptime|availab", "disponib"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "How many servers were added?", es: "¿Cuántos servidores se añadieron?" } },
          { unitId: `${k}b`, question: { en: "What is the latency now?", es: "¿Cuál es ahora la latencia?" } },
        ],
      };
    },
    (rng, k) => {
      const p = person(rng);
      const ticket = int(rng, 4000, 9999);
      const hrs = pick(rng, [4, 6, 12, 24, 48]);
      return {
        en: `Ticket ${ticket} is assigned to ${p.full}, who must respond within ${hrs} hours.`,
        es: `El ticket ${ticket} está asignado a ${p.full}, que debe responder en un plazo de ${hrs} horas.`,
        units: [
          num(`${k}a`, `Ticket ${ticket}`, ticket, 3, "ticket|case|issue", "ticket|caso|incidencia"),
          name(`${k}b`, `Assigned to ${p.full}`, p.cue, 3),
          num(`${k}c`, `Within ${hrs} hours`, hrs, 3, "hour", "hora"),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "What is the ticket number?", es: "¿Cuál es el número del ticket?" } },
          { unitId: `${k}c`, question: { en: "Within how many hours must they respond?", es: "¿En cuántas horas deben responder?" } },
        ],
      };
    },
  ],
  community: [
    (rng, k) => {
      const p = person(rng);
      const apt = int(rng, 2, 48);
      const rent = pick(rng, [650, 780, 920, 1100, 1250]);
      return {
        en: `${p.full} lives in apartment ${apt} and pays ${rent} dollars a month in rent.`,
        es: `${p.full} vive en el apartamento ${apt} y paga ${rent} dólares al mes de alquiler.`,
        units: [
          name(`${k}a`, p.full, p.cue, 3),
          num(`${k}b`, `Apartment ${apt}`, apt, 3, "apartment|flat|unit", "apartamento|piso|depart"),
          qty(`${k}c`, `$${rent} rent`, rent, 3, "rent|dollar|month", "alquiler|renta|dolar|mes"),
        ],
        probes: [
          { unitId: `${k}b`, question: { en: "What is the apartment number?", es: "¿Cuál es el número del apartamento?" } },
          { unitId: `${k}c`, question: { en: "How much is the rent?", es: "¿Cuánto paga de alquiler?" } },
        ],
      };
    },
    (rng, k) => {
      const kids = int(rng, 2, 5);
      const wd = int(rng, 0, 4);
      const hour = int(rng, 2, 6);
      return {
        en: `The family has ${kids} children, and the caseworker will visit on ${WEEKDAYS.en[wd]} at ${hour} p.m.`,
        es: `La familia tiene ${kids} hijos y la trabajadora social los visitará el ${WEEKDAYS.es[wd]} a las ${hour} de la tarde.`,
        units: [
          num(`${k}a`, `${kids} children`, kids, 3, "child|kid", "hijo|nino"),
          idea(`${k}b`, "Caseworker visit", "caseworker|social worker|visit", "trabajador|visit", 2),
          date(`${k}c`, WEEKDAYS.en[wd], strip(WEEKDAYS.en[wd]), strip(WEEKDAYS.es[wd]), 3),
          num(`${k}d`, `At ${hour} p.m.`, hour, 2),
        ],
        probes: [
          { unitId: `${k}a`, question: { en: "How many children does the family have?", es: "¿Cuántos hijos tiene la familia?" } },
          { unitId: `${k}c`, question: { en: "On what day is the visit?", es: "¿Qué día es la visita?" } },
        ],
      };
    },
    (rng, k) => {
      const d = int(rng, 1, 28);
      const m = int(rng, 0, 11);
      const docs = int(rng, 2, 4);
      return {
        en: `The application must be submitted by ${fmtDate(d, m, "en")} with ${docs} forms of identification.`,
        es: `La solicitud debe presentarse antes del ${fmtDate(d, m, "es")} con ${docs} documentos de identidad.`,
        units: [
          idea(`${k}a`, "Submit the application", "applica|submit|form", "solicitud|present|aplicac", 2),
          date(`${k}b`, `Deadline ${fmtDate(d, m, "en")}`, dateCues(d, m).en, dateCues(d, m).es, 3),
          num(`${k}c`, `${docs} forms of ID`, docs, 3, "identif|id|document", "identi|document"),
        ],
        probes: [
          { unitId: `${k}b`, question: { en: "What is the deadline?", es: "¿Cuál es la fecha límite?" } },
          { unitId: `${k}c`, question: { en: "How many forms of ID are needed?", es: "¿Cuántos documentos de identidad se necesitan?" } },
        ],
      };
    },
  ],
};

export function generateDetailPassage(subject: Subject, sentences: number, seed: number) {
  const rng = seededRng(seed);
  const templates = [...TEMPLATES[subject]];
  // shuffle
  for (let i = templates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [templates[i], templates[j]] = [templates[j], templates[i]];
  }
  const segments: GenSegment[] = [];
  for (let i = 0; i < sentences; i++) {
    const t = templates[i % templates.length];
    segments.push(t(rng, `g${i}`));
  }
  return segments;
}
