import type { Difficulty, Lang, MeaningUnit, Subject } from "@/lib/types";
import { date, idea, name, num, qty, term } from "./units";

/**
 * Scripted dialogue-interpreting scenarios for Live Simulations.
 * Each turn is spoken in one language and must be interpreted into the other.
 */
export interface DialogueTurn {
  speaker: string;
  lang: Lang;
  text: string;
  units: MeaningUnit[];
}

export interface Scenario {
  id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  setting: string;
  parties: { name: string; role: string; lang: Lang }[];
  turns: DialogueTurn[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "er-triage",
    title: "Emergency department triage",
    subject: "medical",
    difficulty: 2,
    setting: "A triage nurse assesses a Spanish-speaking patient with abdominal pain.",
    parties: [
      { name: "Nurse Collins", role: "Triage nurse", lang: "en" },
      { name: "Sra. Robles", role: "Patient", lang: "es" },
    ],
    turns: [
      {
        speaker: "Nurse Collins",
        lang: "en",
        text: "Hello, I'm the triage nurse. Can you tell me where the pain is and when it started?",
        units: [
          idea("a1", "Speaker is the triage nurse", "nurse|triage", "enfermer|triaje", 1),
          idea("a2", "Where is the pain", "where", "donde", 3),
          idea("a3", "When did it start", "when|start|began", "cuando|empez|comenz", 3),
        ],
      },
      {
        speaker: "Sra. Robles",
        lang: "es",
        text: "Me duele aquí, en el lado derecho, abajo. Empezó anoche, como a las once, y ha ido empeorando.",
        units: [
          idea("a4", "Pain on the lower right side", "right|lower right", "derech|abajo", 3),
          idea("a5", "Started last night", "last night", "anoche", 3),
          num("a6", "Around eleven o'clock", 11, 2),
          idea("a7", "Getting worse", "worse|worsen", "empeor|peor", 3),
        ],
      },
      {
        speaker: "Nurse Collins",
        lang: "en",
        text: "On a scale from 0 to 10, how bad is the pain right now? And have you had any vomiting or fever?",
        units: [
          idea("a8", "Pain scale 0 to 10", "scale|0 10|10", "escala|0 10|10", 3),
          idea("a9", "How bad is it now", "now|right now|how bad|how much", "ahora|cuanto|que tan", 2),
          idea("a10", "Any vomiting", "vomit|throw", "vomit", 3),
          idea("a11", "Any fever", "fever|temperature", "fiebre|temperatura|calentura", 3),
        ],
      },
      {
        speaker: "Sra. Robles",
        lang: "es",
        text: "Ahora es un ocho. Vomité dos veces esta mañana, pero no he tenido fiebre. Soy alérgica a la penicilina.",
        units: [
          qty("a12", "Pain is an 8", 8, 3),
          qty("a13", "Vomited twice", 2, 3, "vomit|twice|time", "vomit|dos veces"),
          idea("a14", "This morning", "morning", "manana", 2),
          idea("a15", "No fever", "no fever|not had a fever|haven t had|hasn t had|without fever|no temperature", "no he tenido fiebre|sin fiebre|no fiebre|no tengo fiebre", 3),
          term("a16", "Allergic to penicillin", "penicillin", "penicilin", 3),
        ],
      },
      {
        speaker: "Nurse Collins",
        lang: "en",
        text: "Thank you. Please don't eat or drink anything for now. The doctor will see you in about 20 minutes, and we may need an ultrasound.",
        units: [
          idea("a17", "Do not eat or drink", "eat|drink", "comer|beber|tomar", 3),
          qty("a18", "Doctor in about 20 minutes", 20, 3, "minute|doctor", "minuto|medic|doctor"),
          term("a19", "Possible ultrasound", "ultrasound|sonogra|scan", "ecograf|ultrasonido|sonograf", 3),
        ],
      },
    ],
  },
  {
    id: "immigration-interview",
    title: "Asylum intake interview",
    subject: "legal",
    difficulty: 3,
    setting: "An attorney conducts an intake interview with a client who arrived recently.",
    parties: [
      { name: "Attorney Hale", role: "Immigration attorney", lang: "en" },
      { name: "Sr. Paredes", role: "Client", lang: "es" },
    ],
    turns: [
      {
        speaker: "Attorney Hale",
        lang: "en",
        text: "Everything you tell me is confidential. I need the exact date you entered the country and whether anyone was traveling with you.",
        units: [
          idea("b1", "Everything is confidential", "confidential|private", "confidencial|privad", 3),
          idea("b2", "Exact date of entry", "date|when|enter", "fecha|cuando|entr", 3),
          idea("b3", "Was anyone traveling with you", "anyone|someone|travel with|alone", "alguien|viaj|acompa|solo", 3),
        ],
      },
      {
        speaker: "Sr. Paredes",
        lang: "es",
        text: "Entré el 14 de agosto por Laredo. Venía con mi hermano menor, que tiene 16 años, pero a él lo separaron de mí en la frontera.",
        units: [
          date("b4", "Entered August 14", "august 14|14 august|14th of august", "14 agosto|14 de agosto", 3),
          name("b5", "Through Laredo", "laredo", 3),
          idea("b6", "With his younger brother", "brother", "hermano", 3),
          qty("b7", "Brother is 16", 16, 3, "year|old|16", "ano"),
          idea("b8", "They were separated at the border", "separat|border", "separ|frontera", 3),
        ],
      },
      {
        speaker: "Attorney Hale",
        lang: "en",
        text: "I understand. Do you know where your brother is now? Has anyone from the government contacted you about him?",
        units: [
          idea("b9", "Where is the brother now", "where|brother", "donde|hermano", 3),
          idea("b10", "Has the government contacted you", "government|contact|officials", "gobierno|contact|autoridad", 3),
        ],
      },
      {
        speaker: "Sr. Paredes",
        lang: "es",
        text: "Me dijeron que está en un albergue en San Antonio. Hablé con él una sola vez, hace tres semanas, por teléfono.",
        units: [
          idea("b11", "Told he is in a shelter", "shelter", "albergue|refugio", 3),
          name("b12", "In San Antonio", "san antonio|antonio", 3),
          idea("b13", "Spoke with him only once", "once|one time|only", "una sola vez|una vez|solo", 3),
          num("b14", "Three weeks ago", 3, 3, "week", "semana"),
          idea("b15", "By phone", "phone|call", "telefon|llam", 2),
        ],
      },
      {
        speaker: "Attorney Hale",
        lang: "en",
        text: "Your hearing notice says November 2nd. We have to file your application at least 10 days before that, so please bring every document you have on Monday.",
        units: [
          date("b16", "Hearing on November 2", "november 2|2 november|2nd of november", "2 noviembre|2 de noviembre", 3),
          term("b17", "File the application", "application|file", "solicitud|present", 3),
          num("b18", "At least 10 days before", 10, 3, "day", "dia"),
          idea("b19", "Bring every document", "document|paper", "document|papel", 3),
          date("b20", "On Monday", "monday", "lunes", 3),
        ],
      },
    ],
  },
  {
    id: "factory-audit",
    title: "Supplier factory audit",
    subject: "business",
    difficulty: 4,
    setting: "A quality auditor visits a supplier's plant manager to review audit findings.",
    parties: [
      { name: "Ms. Grant", role: "Quality auditor", lang: "en" },
      { name: "Ing. Duarte", role: "Plant manager", lang: "es" },
    ],
    turns: [
      {
        speaker: "Ms. Grant",
        lang: "en",
        text: "We found three major non-conformities. The most serious is that calibration records for the torque tools are missing for the last six months.",
        units: [
          qty("c1", "Three major non-conformities", 3, 3, "non conform|nonconform|finding|issue|problem", "no conformidad|hallazgo|problema"),
          idea("c2", "Most serious one", "serious|important|critical|worst", "grave|important|seri|critic", 2),
          term("c3", "Calibration records", "calibrat", "calibra", 3),
          term("c4", "Torque tools", "torque", "torque|par de apriete|torsion", 3),
          num("c5", "Missing for six months", 6, 3, "month", "mes"),
        ],
      },
      {
        speaker: "Ing. Duarte",
        lang: "es",
        text: "Los registros existen, pero en papel. Estamos migrando a un sistema digital y algunos archivos todavía no se han escaneado. Se los puedo enseñar hoy mismo.",
        units: [
          idea("c6", "Records exist on paper", "paper|exist|hard copy", "papel|exist", 3),
          idea("c7", "Migrating to a digital system", "digital|migrat|electronic", "digital|migr|electronic", 3),
          idea("c8", "Some files not yet scanned", "scan", "escane", 3),
          idea("c9", "Can show them today", "today|show", "hoy|ensen|mostrar", 3),
        ],
      },
      {
        speaker: "Ms. Grant",
        lang: "en",
        text: "That would help, but I still need a corrective action plan within 30 days, and the defect rate on line 2 must come down from 1.8 to under 0.5 percent.",
        units: [
          term("c10", "Corrective action plan", "corrective|action plan|plan", "correctiv|plan de accion|plan", 3),
          num("c11", "Within 30 days", 30, 3, "day", "dia"),
          num("c12", "Line 2", 2, 2, "line", "linea"),
          qty("c13", "Defect rate from 1.8%", 1.8, 3, "defect|percent", "defect|por ciento"),
          qty("c14", "To under 0.5%", 0.5, 3, "under|below|less|percent", "menos|debajo|por ciento"),
        ],
      },
      {
        speaker: "Ing. Duarte",
        lang: "es",
        text: "De acuerdo. Ya contratamos a dos inspectores más para el turno de noche, que es donde se concentran la mayoría de los defectos.",
        units: [
          idea("c15", "Agreed", "agree|ok|fine|understood|all right", "de acuerdo|vale|entendido", 1),
          qty("c16", "Hired two more inspectors", 2, 3, "inspector|hire", "inspector|contrat"),
          idea("c17", "For the night shift", "night shift|night", "turno de noche|noche", 3),
          idea("c18", "Where most defects occur", "most|majority|concentrat", "mayoria|concentr", 3),
        ],
      },
    ],
  },
];

export function getScenario(id?: string) {
  return SCENARIOS.find((s) => s.id === id);
}
