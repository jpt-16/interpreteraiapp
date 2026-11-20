import type { Difficulty, MeaningUnit, Subject } from "@/lib/types";
import { date, idea, name, num, qty, term } from "./units";

/**
 * Curated bilingual passage library.
 * Every segment is authored in English and Spanish with a shared set of
 * meaning units, so each passage can be used in either direction and for
 * same-language memory work.
 */
export interface LibrarySegment {
  en: string;
  es: string;
  units: MeaningUnit[];
}

export interface LibraryPassage {
  id: string;
  subject: Subject;
  difficulty: Difficulty;
  title: { en: string; es: string };
  context: { en: string; es: string };
  segments: LibrarySegment[];
}

export const LIBRARY: LibraryPassage[] = [
  {
    id: "med-discharge",
    subject: "medical",
    difficulty: 2,
    title: { en: "Discharge instructions after pneumonia", es: "Instrucciones de alta tras una neumonía" },
    context: {
      en: "A hospital physician speaks to a patient and family member at discharge.",
      es: "Una médica del hospital habla con un paciente y su familiar en el momento del alta.",
    },
    segments: [
      {
        en: "Good morning, Mr. Alvarez. Your chest X-ray this morning shows the pneumonia is clearing, so you can go home today.",
        es: "Buenos días, señor Álvarez. La radiografía de tórax de esta mañana muestra que la neumonía está mejorando, así que hoy puede irse a casa.",
        units: [
          name("m1", "Patient: Mr. Alvarez", "alvarez"),
          idea("m2", "Chest X-ray shows pneumonia is clearing", "pneumonia clear|pneumonia improv|pneumonia better|x ray improv", "neumonia mejor|neumonia resol|neumonia desapar|radiograf mejor", 3),
          idea("m3", "Patient can go home today", "home today|discharg today|go home|leave today", "casa hoy|alta hoy|irse a casa|ir a casa", 3),
        ],
      },
      {
        en: "You will continue the antibiotic, amoxicillin, 500 milligrams three times a day for another 5 days.",
        es: "Va a seguir tomando el antibiótico, amoxicilina, 500 miligramos tres veces al día durante 5 días más.",
        units: [
          term("m4", "Antibiotic: amoxicillin", "amoxicil", "amoxicil", 3),
          qty("m5", "Dose: 500 mg", 500, 3, "milligram|mg", "miligram|mg"),
          qty("m6", "Three times a day", 3, 3, "day|daily", "dia|diari"),
          num("m7", "For another 5 days", 5, 2, "day", "dia"),
        ],
      },
      {
        en: "Please finish the whole course even if you feel better, because stopping early can let the infection come back.",
        es: "Por favor, termine todo el tratamiento aunque se sienta mejor, porque si lo deja antes la infección puede volver.",
        units: [
          idea("m8", "Finish the whole course even if feeling better", "finish|complet|whole course|all the", "termin|complet|todo el tratamiento", 3),
          idea("m9", "Stopping early can let the infection return", "infection come back|infection return|come back|relaps|stop early", "infeccion vuelv|infeccion regres|volver|recaida|dejar antes", 2),
        ],
      },
      {
        en: "For fever you may take acetaminophen, but no more than 3,000 milligrams in 24 hours.",
        es: "Para la fiebre puede tomar paracetamol, pero no más de 3000 miligramos en 24 horas.",
        units: [
          term("m10", "Acetaminophen for fever", "acetaminophen|paracetamol|tylenol", "paracetamol|acetaminofen", 2),
          qty("m11", "Maximum 3,000 mg", 3000, 3, "milligram|mg", "miligram|mg"),
          num("m12", "In 24 hours", 24, 2, "hour", "hora"),
        ],
      },
      {
        en: "Come back to the emergency department right away if you have trouble breathing, chest pain, or a fever above 39 degrees.",
        es: "Vuelva a urgencias de inmediato si tiene dificultad para respirar, dolor en el pecho o fiebre de más de 39 grados.",
        units: [
          idea("m13", "Return to emergency department immediately", "emergency|er |urgent|hospital right away", "urgencia|emergencia", 3),
          idea("m14", "Warning sign: trouble breathing", "breath", "respir", 3),
          idea("m15", "Warning sign: chest pain", "chest pain|pain chest", "dolor pecho|dolor de pecho|dolor toracic", 3),
          qty("m16", "Fever above 39 degrees", 39, 3, "fever|degree", "fiebre|grado"),
        ],
      },
      {
        en: "Your follow-up appointment with Dr. Okafor is on Tuesday, March 12th, at 10:30 in the morning.",
        es: "Su cita de seguimiento con el doctor Okafor es el martes 12 de marzo a las 10:30 de la mañana.",
        units: [
          name("m17", "Follow-up with Dr. Okafor", "okafor"),
          date("m18", "Tuesday, March 12", "march 12|12 march|tuesday 12", "12 marzo|martes 12", 3),
          num("m19", "At 10:30", 10.3, 2, "", ""),
        ],
      },
      {
        en: "Until then, rest, drink plenty of fluids, and avoid smoking, which will slow your recovery.",
        es: "Hasta entonces, descanse, beba muchos líquidos y evite fumar, porque eso retrasará su recuperación.",
        units: [
          idea("m20", "Rest", "rest", "descans|repos", 1),
          idea("m21", "Drink plenty of fluids", "fluid|liquid|water|drink", "liquid|agua|beb|hidrat", 2),
          idea("m22", "Avoid smoking — slows recovery", "smok", "fum|tabaco", 2),
        ],
      },
    ],
  },
  {
    id: "legal-deposition",
    subject: "legal",
    difficulty: 3,
    title: { en: "Witness statement: warehouse incident", es: "Declaración de testigo: incidente en el almacén" },
    context: {
      en: "A witness describes a workplace incident during a deposition.",
      es: "Un testigo describe un incidente laboral durante una declaración jurada.",
    },
    segments: [
      {
        en: "On the night of October 3rd, I was working the second shift at the Riverside warehouse, which starts at 4 p.m. and ends at midnight.",
        es: "La noche del 3 de octubre yo trabajaba en el segundo turno del almacén Riverside, que empieza a las 4 de la tarde y termina a medianoche.",
        units: [
          date("l1", "Night of October 3", "october 3|3 october|3rd of october", "3 octubre|3 de octubre", 3),
          idea("l2", "Working the second shift", "second shift|evening shift|night shift", "segundo turno|turno de tarde|turno de noche", 2),
          name("l3", "Riverside warehouse", "riverside"),
          idea("l4", "Shift from 4 p.m. to midnight", "4 midnight|4 12|4 pm", "4 medianoche|4 de la tarde|16", 1),
        ],
      },
      {
        en: "At around 9:15, I heard a loud crash from aisle 14 and saw that a forklift had hit one of the steel shelving units.",
        es: "Alrededor de las 9:15 escuché un fuerte estruendo en el pasillo 14 y vi que una carretilla elevadora había chocado contra una de las estanterías de acero.",
        units: [
          num("l5", "Around 9:15", 9.15, 2),
          idea("l6", "Heard a loud crash", "crash|bang|noise|sound|impact", "estruendo|ruido|golpe|estrepito|choque", 2),
          num("l7", "Aisle 14", 14, 3, "aisle", "pasillo"),
          term("l8", "A forklift hit steel shelving", "forklift", "carretilla|montacarga|elevador", 3),
          idea("l9", "Steel shelving unit", "shelv|rack", "estanter|anaquel|repisa", 2),
        ],
      },
      {
        en: "The driver, a man I knew as Marcus, was not wearing his seatbelt, and he had been complaining about the brakes for at least two weeks.",
        es: "El conductor, un hombre al que yo conocía como Marcus, no llevaba puesto el cinturón de seguridad y llevaba al menos dos semanas quejándose de los frenos.",
        units: [
          name("l10", "Driver known as Marcus", "marcus"),
          idea("l11", "Driver was not wearing a seatbelt", "seatbelt|seat belt|belt", "cinturon", 3),
          idea("l12", "Had complained about the brakes", "brake", "freno", 3),
          num("l13", "For at least two weeks", 2, 2, "week", "semana"),
        ],
      },
      {
        en: "I did not see the impact itself; I only saw the aftermath, so I cannot say how fast he was going.",
        es: "Yo no vi el impacto en sí; solo vi lo que pasó después, así que no puedo decir a qué velocidad iba.",
        units: [
          idea("l14", "Did not see the impact itself", "not see|didn t see|did not see|didnt see|never saw", "no vi|no lo vi", 3),
          idea("l15", "Only saw the aftermath", "after|aftermath|result", "despues|consecuenc|resultado", 2),
          idea("l16", "Cannot say how fast he was going", "how fast|speed", "velocidad|que tan rapido|rapido", 3),
        ],
      },
      {
        en: "Two other employees, Dana Whitfield and a temporary worker whose name I never learned, ran over to help before I did.",
        es: "Otros dos empleados, Dana Whitfield y un trabajador temporal cuyo nombre nunca supe, corrieron a ayudar antes que yo.",
        units: [
          num("l17", "Two other employees", 2, 1, "employee|worker|other", "emplead|trabajador|otro"),
          name("l18", "Dana Whitfield", "whitfield|dana"),
          idea("l19", "A temporary worker whose name the witness never learned", "temp|name", "temporal|nombre", 2),
          idea("l20", "They ran to help before the witness", "help", "ayud", 2),
        ],
      },
      {
        en: "I reported the brake problem to my supervisor in writing on September 20th, and I still have a copy of that email.",
        es: "Yo informé por escrito del problema de los frenos a mi supervisor el 20 de septiembre y todavía tengo una copia de ese correo.",
        units: [
          idea("l21", "Reported brake problem to supervisor in writing", "supervisor|report|in writing|written", "supervisor|inform|por escrito|report", 3),
          date("l22", "On September 20", "september 20|20 september|20th of september", "20 septiembre|20 de septiembre", 3),
          idea("l23", "Still has a copy of the email", "copy|email|e mail", "copia|correo|email", 3),
        ],
      },
    ],
  },
  {
    id: "biz-earnings",
    subject: "business",
    difficulty: 3,
    title: { en: "Quarterly results briefing", es: "Presentación de resultados trimestrales" },
    context: {
      en: "A chief financial officer presents quarterly results to analysts.",
      es: "Una directora financiera presenta los resultados trimestrales a los analistas.",
    },
    segments: [
      {
        en: "Thank you all for joining. In the third quarter, revenue reached 48.6 million dollars, up 12 percent compared with the same period last year.",
        es: "Gracias a todos por acompañarnos. En el tercer trimestre los ingresos alcanzaron 48,6 millones de dólares, un 12 por ciento más que en el mismo periodo del año pasado.",
        units: [
          idea("b1", "Third quarter", "third quarter|q3|quarter 3", "tercer trimestre|q3|trimestre 3", 2),
          qty("b2", "Revenue $48.6 million", 48600000, 3, "revenue|sales|income", "ingreso|venta|factur"),
          qty("b3", "Up 12 percent", 12, 3, "percent|%|up|increase|grow", "por ciento|%|aument|crec|mas"),
          idea("b4", "Compared with same period last year", "last year|year on year|previous year|year over year", "ano pasado|ano anterior|interanual", 2),
        ],
      },
      {
        en: "Growth was driven mainly by our subscription business in Latin America, where we added roughly 9,000 new corporate clients.",
        es: "El crecimiento se debió principalmente a nuestro negocio de suscripciones en América Latina, donde sumamos unos 9000 nuevos clientes corporativos.",
        units: [
          idea("b5", "Driven by subscription business", "subscript", "suscrip", 3),
          name("b6", "Latin America", "latin america|latinoamer|latam|america latina", 3),
          qty("b7", "About 9,000 new corporate clients", 9000, 3, "client|customer", "client"),
        ],
      },
      {
        en: "However, operating margin fell from 18 to 15 percent, largely because of higher shipping costs and a one-time restructuring charge.",
        es: "Sin embargo, el margen operativo bajó del 18 al 15 por ciento, sobre todo por el aumento de los costes de envío y un cargo único de reestructuración.",
        units: [
          idea("b8", "Operating margin fell", "margin fell|margin decreas|margin declin|margin drop|margin down|lower margin", "margen baj|margen cay|margen dismin|margen descend", 3),
          num("b9", "From 18 percent", 18, 3, "percent|%", "por ciento|%"),
          num("b10", "To 15 percent", 15, 3, "percent|%", "por ciento|%"),
          idea("b11", "Higher shipping costs", "shipping|freight|logistic|transport", "envio|transporte|flete|logistic", 2),
          idea("b12", "One-time restructuring charge", "restructur", "reestructur|restructur", 2),
        ],
      },
      {
        en: "Excluding that charge, which totaled 2.1 million dollars, margin would have been essentially flat.",
        es: "Sin contar ese cargo, que ascendió a 2,1 millones de dólares, el margen se habría mantenido prácticamente estable.",
        units: [
          qty("b13", "Charge totaled $2.1 million", 2100000, 3),
          idea("b14", "Excluding it, margin essentially flat", "flat|stable|unchanged|same", "estable|igual|sin cambio|plano|mantenido", 3),
        ],
      },
      {
        en: "We are raising our full-year guidance to between 190 and 195 million dollars.",
        es: "Elevamos nuestra previsión para todo el año a entre 190 y 195 millones de dólares.",
        units: [
          idea("b15", "Raising full-year guidance", "rais|increas|guidance|forecast|outlook", "elev|aument|previs|pronostic|proyecc", 3),
          qty("b16", "Lower bound $190 million", 190000000, 3),
          qty("b17", "Upper bound $195 million", 195000000, 3),
        ],
      },
      {
        en: "Finally, the board has approved a share buyback of up to 25 million dollars over the next 18 months.",
        es: "Por último, el consejo ha aprobado una recompra de acciones de hasta 25 millones de dólares en los próximos 18 meses.",
        units: [
          idea("b18", "Board approved a share buyback", "buyback|buy back|repurchas", "recompra|readquisic", 3),
          qty("b19", "Up to $25 million", 25000000, 3),
          num("b20", "Over the next 18 months", 18, 2, "month", "mes"),
        ],
      },
    ],
  },
  {
    id: "conf-water",
    subject: "conference",
    difficulty: 4,
    title: { en: "Opening remarks: regional water summit", es: "Discurso de apertura: cumbre regional del agua" },
    context: {
      en: "A deputy minister opens an international conference on water security.",
      es: "Una viceministra inaugura una conferencia internacional sobre seguridad hídrica.",
    },
    segments: [
      {
        en: "Distinguished delegates, it is an honour to welcome you to Lima for the fourth Regional Summit on Water Security.",
        es: "Distinguidos delegados, es un honor darles la bienvenida a Lima para la cuarta Cumbre Regional sobre Seguridad Hídrica.",
        units: [
          name("c1", "Lima", "lima"),
          num("c2", "Fourth summit", 4, 2, "summit|fourth", "cumbre|cuarta"),
          term("c3", "Water security", "water secur|water", "segur hidric|agua", 3),
        ],
      },
      {
        en: "Over the last decade, our glaciers have lost nearly a third of their volume, and the communities that depend on them are already feeling the consequences.",
        es: "En la última década, nuestros glaciares han perdido casi un tercio de su volumen, y las comunidades que dependen de ellos ya sienten las consecuencias.",
        units: [
          idea("c4", "Over the last decade", "decade|10 years", "decada|10 anos", 2),
          idea("c5", "Glaciers lost nearly a third of their volume", "glacier third|glacier 1 3|third", "glaciar tercio|tercio", 3),
          idea("c6", "Dependent communities already feel consequences", "communit", "comunidad", 2),
        ],
      },
      {
        en: "Let me be clear: this is not a distant threat. In some highland provinces, water available per person has fallen by 40 percent since 2010.",
        es: "Permítanme ser clara: no se trata de una amenaza lejana. En algunas provincias del altiplano, el agua disponible por persona ha disminuido un 40 por ciento desde 2010.",
        units: [
          idea("c7", "Not a distant threat", "not distant|not a distant|not far|immediate|now", "no lejana|no es lejana|no es una amenaza lejana|inmediat|ahora", 3),
          idea("c8", "Highland provinces", "highland|mountain|andean", "altiplano|sierra|andin|montan", 2),
          idea("c9", "Water available per person", "per person|per capita", "por persona|per capita|por habitante", 2),
          qty("c10", "Fallen by 40 percent", 40, 3, "percent|%", "por ciento|%"),
          num("c11", "Since 2010", 2010, 3),
        ],
      },
      {
        en: "My government will therefore propose three commitments at this summit.",
        es: "Por ello, mi gobierno propondrá tres compromisos en esta cumbre.",
        units: [num("c12", "Three commitments", 3, 2, "commit|pledge|proposal", "compromis|propuest")],
      },
      {
        en: "First, a shared monitoring network for all transboundary basins, financed jointly by participating states.",
        es: "Primero, una red de monitoreo compartida para todas las cuencas transfronterizas, financiada conjuntamente por los Estados participantes.",
        units: [
          idea("c13", "Shared monitoring network", "monitor", "monitor|vigilancia|seguimiento", 3),
          term("c14", "Transboundary basins", "transboundar|cross border|basin", "transfronteriz|cuenca", 3),
          idea("c15", "Jointly financed by participating states", "joint|shared|together|financ|fund", "conjunt|financ|compart", 2),
        ],
      },
      {
        en: "Second, a target to reduce water losses in urban distribution systems by half before 2035.",
        es: "Segundo, una meta para reducir a la mitad las pérdidas de agua en los sistemas de distribución urbana antes de 2035.",
        units: [
          idea("c16", "Reduce water losses in urban distribution", "loss|leak|wast", "perdida|fuga|desperdic", 3),
          idea("c17", "By half", "half|50", "mitad|50", 3),
          num("c18", "Before 2035", 2035, 3),
        ],
      },
      {
        en: "And third, a dedicated fund for small farmers, who use most of our water but have the least capacity to adapt.",
        es: "Y tercero, un fondo específico para los pequeños agricultores, que usan la mayor parte de nuestra agua pero tienen la menor capacidad de adaptación.",
        units: [
          idea("c19", "Dedicated fund for small farmers", "fund small farm|fund farm|farmer", "fondo agricultor|agricultor|campesin|productor", 3),
          idea("c20", "They use most of the water", "most|majority", "mayor parte|mayoria", 2),
          idea("c21", "But have the least capacity to adapt", "adapt|least capacity|capacity", "adapt|capacidad", 2),
        ],
      },
      {
        en: "None of this will succeed without the people in this room. I count on your expertise and, above all, on your willingness to compromise.",
        es: "Nada de esto funcionará sin las personas que están en esta sala. Cuento con su experiencia y, sobre todo, con su disposición a llegar a acuerdos.",
        units: [
          idea("c22", "Success depends on the people in this room", "room|you|people here|without you", "sala|ustedes|sin ustedes|personas", 2),
          idea("c23", "Counts on their expertise", "expert|knowledge|experience", "experiencia|conocimiento|pericia", 1),
          idea("c24", "Above all, on their willingness to compromise", "compromis|agree|consensus", "acuerdo|ceder|consens|compromis", 2),
        ],
      },
    ],
  },
  {
    id: "tech-outage",
    subject: "technical",
    difficulty: 3,
    title: { en: "Incident review: payment outage", es: "Revisión de incidente: caída del sistema de pagos" },
    context: {
      en: "An engineering lead explains an outage to a client's operations team.",
      es: "Una responsable de ingeniería explica una caída del servicio al equipo de operaciones de un cliente.",
    },
    segments: [
      {
        en: "Yesterday between 2:40 and 3:25 in the afternoon, roughly 30 percent of card payments failed in your European stores.",
        es: "Ayer, entre las 2:40 y las 3:25 de la tarde, aproximadamente el 30 por ciento de los pagos con tarjeta fallaron en sus tiendas de Europa.",
        units: [
          idea("t1", "Yesterday afternoon", "yesterday", "ayer", 2),
          num("t2", "Started 2:40", 2.4, 2),
          num("t3", "Ended 3:25", 3.25, 2),
          qty("t4", "About 30 percent of card payments failed", 30, 3, "percent|%", "por ciento|%"),
          idea("t5", "Card payments failed", "card payment|payment fail|transaction", "pago tarjeta|pagos con tarjeta|pago|transacc", 3),
          name("t6", "European stores", "europe", 2),
        ],
      },
      {
        en: "The root cause was an expired security certificate on one of our load balancers in the Frankfurt data center.",
        es: "La causa principal fue un certificado de seguridad caducado en uno de nuestros balanceadores de carga del centro de datos de Fráncfort.",
        units: [
          idea("t7", "Root cause", "root cause|cause|because|reason", "causa|motivo|debido", 1),
          term("t8", "Expired security certificate", "expir certific|certific", "certific caduc|certific vencid|certific expir|certific", 3),
          term("t9", "Load balancer", "load balanc|balancer", "balanceador|equilibrador", 3),
          name("t10", "Frankfurt data center", "frankfurt", 3),
        ],
      },
      {
        en: "Our monitoring did detect the errors within four minutes, but the alert was routed to a team that had been reorganized the week before.",
        es: "Nuestro sistema de monitoreo sí detectó los errores en cuatro minutos, pero la alerta se envió a un equipo que se había reorganizado la semana anterior.",
        units: [
          idea("t11", "Monitoring detected the errors", "monitor detect|detect", "detect|monitor", 2),
          num("t12", "Within four minutes", 4, 3, "minute", "minuto"),
          idea("t13", "Alert routed to a reorganized team", "reorgan|wrong team|team", "reorganiz|equipo equivocado|equipo", 3),
          idea("t14", "Reorganized the week before", "week before|previous week|last week|week earlier", "semana anterior|semana pasada|semana antes", 2),
        ],
      },
      {
        en: "We have since renewed every certificate due to expire in the next 90 days and added automatic renewal.",
        es: "Desde entonces hemos renovado todos los certificados que vencen en los próximos 90 días y hemos añadido la renovación automática.",
        units: [
          idea("t15", "Renewed every certificate due to expire", "renew", "renov", 3),
          num("t16", "In the next 90 days", 90, 3, "day", "dia"),
          idea("t17", "Added automatic renewal", "automat", "automat", 3),
        ],
      },
      {
        en: "No card data was exposed at any point. Failed transactions were simply declined and customers were not charged.",
        es: "En ningún momento se expusieron datos de tarjetas. Las transacciones fallidas simplemente se rechazaron y no se cobró a los clientes.",
        units: [
          idea("t18", "No card data was exposed", "no data|not expos|no card data|data was not|no expos|no leak|secure", "ningun dato|no se expus|no hubo exposicion|datos no|ninguna", 3),
          idea("t19", "Failed transactions were declined", "declin|reject", "rechaz|deneg", 2),
          idea("t20", "Customers were not charged", "not charg|no charg|weren t charged|werent charged", "no se cobr|no se les cobr|no cobr|sin cobr", 3),
        ],
      },
      {
        en: "We will send a full written report by Friday, including a credit of 15 percent on this month's service fees.",
        es: "Enviaremos un informe escrito completo antes del viernes, que incluirá un crédito del 15 por ciento en las tarifas de servicio de este mes.",
        units: [
          idea("t21", "Full written report", "report", "informe|reporte", 2),
          date("t22", "By Friday", "friday", "viernes", 3),
          qty("t23", "Credit of 15 percent", 15, 3, "credit|discount|refund|percent", "credito|descuento|reembolso|por ciento"),
          idea("t24", "On this month's service fees", "fee|month|service", "tarifa|mes|servicio|cuota", 1),
        ],
      },
    ],
  },
  {
    id: "comm-school",
    subject: "community",
    difficulty: 1,
    title: { en: "Parent meeting: new school schedule", es: "Reunión de padres: nuevo horario escolar" },
    context: {
      en: "A school principal explains changes to parents at an evening meeting.",
      es: "El director de una escuela explica unos cambios a las familias en una reunión por la tarde.",
    },
    segments: [
      {
        en: "Good evening, everyone. Starting next Monday, classes will begin at 8:15 instead of 8:00.",
        es: "Buenas tardes a todos. A partir del próximo lunes, las clases empezarán a las 8:15 en lugar de a las 8:00.",
        units: [
          date("s1", "Starting next Monday", "monday", "lunes", 3),
          num("s2", "Classes begin at 8:15", 8.15, 3),
          idea("s3", "Instead of 8:00", "instead|rather than|not 8|before|used to", "en lugar|en vez|antes", 2),
        ],
      },
      {
        en: "The school bus will pick up students fifteen minutes later than now.",
        es: "El autobús escolar recogerá a los alumnos quince minutos más tarde que ahora.",
        units: [
          term("s4", "School bus", "bus", "autobus|bus|camion", 2),
          num("s5", "Fifteen minutes later", 15, 3, "minute|later", "minuto|tarde"),
        ],
      },
      {
        en: "Breakfast is still free for every child, and it is served in the cafeteria from 7:45.",
        es: "El desayuno sigue siendo gratuito para todos los niños y se sirve en el comedor desde las 7:45.",
        units: [
          idea("s6", "Breakfast is free for every child", "breakfast free|free breakfast|free", "desayuno gratu|gratis|gratuit", 3),
          idea("s7", "Served in the cafeteria", "cafeteria|dining|lunchroom", "comedor|cafeteria", 1),
          num("s8", "From 7:45", 7.45, 2),
        ],
      },
      {
        en: "If your child will be absent, please call the front office before 9 o'clock.",
        es: "Si su hijo va a faltar, llame por favor a la oficina principal antes de las 9.",
        units: [
          idea("s9", "If the child will be absent", "absent|miss school|not come|sick", "falt|ausent|no va a venir|no asist", 3),
          idea("s10", "Call the front office", "call office|office|call", "oficina|llam", 2),
          num("s11", "Before 9 o'clock", 9, 3, "before", "antes"),
        ],
      },
      {
        en: "Our next parent meeting is on November 18th. Interpreters will be available in Spanish and Vietnamese.",
        es: "Nuestra próxima reunión de padres es el 18 de noviembre. Habrá intérpretes disponibles en español y vietnamita.",
        units: [
          date("s12", "Next meeting November 18", "november 18|18 november|18th of november", "18 noviembre|18 de noviembre", 3),
          idea("s13", "Interpreters available", "interpret", "interpret", 2),
          idea("s14", "In Spanish and Vietnamese", "spanish vietnam", "espanol vietnam", 2),
        ],
      },
    ],
  },
  {
    id: "med-cardiology",
    subject: "medical",
    difficulty: 4,
    title: { en: "Cardiology consultation: test results", es: "Consulta de cardiología: resultados de pruebas" },
    context: {
      en: "A cardiologist explains test results and treatment options to a patient.",
      es: "Una cardióloga explica los resultados de unas pruebas y las opciones de tratamiento a un paciente.",
    },
    segments: [
      {
        en: "Ms. Ferreira, your echocardiogram shows an ejection fraction of 38 percent, which means your heart is pumping less effectively than it should.",
        es: "Señora Ferreira, su ecocardiograma muestra una fracción de eyección del 38 por ciento, lo que significa que su corazón bombea con menos eficacia de la que debería.",
        units: [
          name("k1", "Patient: Ms. Ferreira", "ferreira"),
          term("k2", "Echocardiogram", "echocardio|echo|ultrasound", "ecocardio|eco", 2),
          term("k3", "Ejection fraction", "ejection fraction|ejection", "fraccion de eyeccion|eyeccion", 3),
          qty("k4", "38 percent", 38, 3, "percent|%", "por ciento|%"),
          idea("k5", "Heart pumping less effectively", "pump less|pump|weak", "bombea menos|bombe|debil", 3),
        ],
      },
      {
        en: "A normal value is above 50 percent. This is consistent with what we call heart failure with reduced ejection fraction.",
        es: "Un valor normal es superior al 50 por ciento. Esto es compatible con lo que llamamos insuficiencia cardiaca con fracción de eyección reducida.",
        units: [
          qty("k6", "Normal is above 50 percent", 50, 2, "normal|percent", "normal|por ciento"),
          term("k7", "Heart failure with reduced ejection fraction", "heart failure|cardiac failure", "insuficiencia cardiac|falla cardiac", 3),
        ],
      },
      {
        en: "The good news is that your coronary arteries showed no significant blockages on the angiogram last Thursday.",
        es: "La buena noticia es que en el angiograma del jueves pasado sus arterias coronarias no mostraron obstrucciones importantes.",
        units: [
          term("k8", "Coronary arteries", "coronar|arter", "coronari|arteria", 2),
          idea("k9", "No significant blockages", "no blockage|no significant|not blocked|no major|no obstruct|clear", "no mostraron obstruccion|sin obstruccion|no hay obstruccion|ninguna obstruccion|no obstru|sin bloqueo", 3),
          term("k10", "Angiogram", "angiogra|catheter", "angiogra|cateteris", 2),
          date("k11", "Last Thursday", "thursday", "jueves", 2),
        ],
      },
      {
        en: "I am going to start you on two medications: a beta blocker called carvedilol, starting at 3.125 milligrams twice daily, and a diuretic to reduce the swelling in your legs.",
        es: "Voy a empezar con dos medicamentos: un betabloqueante llamado carvedilol, empezando con 3,125 miligramos dos veces al día, y un diurético para reducir la hinchazón de las piernas.",
        units: [
          num("k12", "Two medications", 2, 2, "medic|drug", "medicament|farmac"),
          term("k13", "Beta blocker", "beta block|betablock", "betabloque|beta bloque", 3),
          term("k14", "Carvedilol", "carvedil", "carvedil", 3),
          qty("k15", "3.125 mg", 3.125, 3, "milligram|mg", "miligram|mg"),
          qty("k16", "Twice daily", 2, 3, "twice|day|daily", "dos veces|dia"),
          term("k17", "Diuretic", "diuretic|water pill", "diuretic", 3),
          idea("k18", "To reduce swelling in the legs", "swell|edema|leg", "hinchaz|edema|pierna|inflamac", 2),
        ],
      },
      {
        en: "Weigh yourself every morning. If you gain more than 2 kilos in 3 days, call us, because that usually means fluid is building up.",
        es: "Pésese todas las mañanas. Si aumenta más de 2 kilos en 3 días, llámenos, porque eso suele significar que se está acumulando líquido.",
        units: [
          idea("k19", "Weigh yourself every morning", "weigh", "pes", 3),
          qty("k20", "More than 2 kilos", 2, 3, "kilo|kg", "kilo|kg"),
          num("k21", "In 3 days", 3, 3, "day", "dia"),
          idea("k22", "Call the clinic", "call", "llam", 2),
          idea("k23", "Means fluid is building up", "fluid|water|retain", "liquido|retenc|agua", 2),
        ],
      },
      {
        en: "Limit salt to under 2 grams a day. We will repeat the echocardiogram in 3 months to see whether the treatment is working.",
        es: "Limite la sal a menos de 2 gramos al día. Repetiremos el ecocardiograma dentro de 3 meses para ver si el tratamiento está funcionando.",
        units: [
          idea("k24", "Limit salt", "salt|sodium", "sal|sodio", 3),
          qty("k25", "Under 2 grams a day", 2, 3, "gram|g ", "gramo|gr"),
          idea("k26", "Repeat echocardiogram", "repeat|another|again", "repet|otro|nuevo", 2),
          num("k27", "In 3 months", 3, 3, "month", "mes"),
        ],
      },
    ],
  },
  {
    id: "biz-negotiation",
    subject: "business",
    difficulty: 5,
    title: { en: "Supplier negotiation: revised terms", es: "Negociación con proveedor: condiciones revisadas" },
    context: {
      en: "A procurement director presents a counter-offer to a manufacturing supplier.",
      es: "Un director de compras presenta una contraoferta a un proveedor industrial.",
    },
    segments: [
      {
        en: "We have reviewed your proposal carefully, and while we value the relationship, the unit price of 14.80 euros is simply not workable for us at the volumes we are discussing.",
        es: "Hemos revisado su propuesta con detenimiento y, aunque valoramos la relación, el precio unitario de 14,80 euros sencillamente no es viable para nosotros con los volúmenes de los que hablamos.",
        units: [
          idea("n1", "Proposal reviewed carefully", "review|look|consider", "revis|analiz|estudi", 1),
          idea("n2", "We value the relationship", "value|relationship|appreciat", "valor|relacion|aprecia", 2),
          qty("n3", "Unit price €14.80", 14.8, 3, "price|euro", "precio|euro"),
          idea("n4", "Not workable at these volumes", "not workable|not viable|not acceptable|can t accept|cannot accept|too high|not feasible|doesn t work|does not work", "no es viable|no viable|no es aceptable|no podemos|demasiado alto|no funciona|inviable", 3),
        ],
      },
      {
        en: "Our counter-proposal is 13.20 euros per unit, with a firm commitment of 120,000 units in the first year.",
        es: "Nuestra contrapropuesta es de 13,20 euros por unidad, con un compromiso firme de 120.000 unidades el primer año.",
        units: [
          idea("n5", "Counter-proposal", "counter|propos|offer", "contra|propuest|oferta", 2),
          qty("n6", "€13.20 per unit", 13.2, 3, "euro|unit", "euro|unidad"),
          idea("n7", "Firm commitment", "firm|commit|guarantee", "firme|compromiso|garantiz", 2),
          qty("n8", "120,000 units", 120000, 3, "unit", "unidad"),
          idea("n9", "In the first year", "first year", "primer ano", 2),
        ],
      },
      {
        en: "In exchange, we are prepared to shorten our payment terms from 90 to 45 days, which we understand is important for your cash flow.",
        es: "A cambio, estamos dispuestos a reducir nuestro plazo de pago de 90 a 45 días, lo que entendemos que es importante para su flujo de caja.",
        units: [
          idea("n10", "In exchange", "exchange|return", "cambio|contrapartida", 2),
          idea("n11", "Shorten payment terms", "payment term|pay|shorten", "plazo de pago|pago|reduc|acort", 3),
          num("n12", "From 90 days", 90, 3, "day", "dia"),
          num("n13", "To 45 days", 45, 3, "day", "dia"),
          term("n14", "Important for supplier's cash flow", "cash flow|liquidity|cash", "flujo de caja|liquidez|tesoreria|caja", 2),
        ],
      },
      {
        en: "We would also need a penalty clause: if more than 2 percent of any shipment is defective, the cost of replacement is on your side.",
        es: "También necesitaríamos una cláusula de penalización: si más del 2 por ciento de cualquier envío es defectuoso, el coste de la sustitución corre por su cuenta.",
        units: [
          term("n15", "Penalty clause", "penalt|clause", "penaliz|clausula", 3),
          qty("n16", "More than 2 percent defective", 2, 3, "percent|defect", "por ciento|defect"),
          idea("n17", "Supplier bears replacement cost", "replac|your cost|you pay|on your side|your side", "sustituc|reemplaz|su cuenta|ustedes pag", 3),
        ],
      },
      {
        en: "Delivery must be to our Monterrey plant, not to the port, and lead time cannot exceed six weeks.",
        es: "La entrega debe hacerse en nuestra planta de Monterrey, no en el puerto, y el plazo de entrega no puede superar las seis semanas.",
        units: [
          name("n18", "Delivery to Monterrey plant", "monterrey", 3),
          idea("n19", "Not to the port", "not port|port", "no puerto|puerto", 2),
          idea("n20", "Lead time", "lead time|deliver", "plazo de entrega|entrega", 2),
          num("n21", "Cannot exceed six weeks", 6, 3, "week", "semana"),
        ],
      },
      {
        en: "If these terms are acceptable in principle, we can have a draft contract to you by the 30th, and we would aim to sign before the end of the quarter.",
        es: "Si estas condiciones les parecen aceptables en principio, podemos enviarles un borrador de contrato antes del día 30, y nuestro objetivo sería firmar antes del final del trimestre.",
        units: [
          idea("n22", "If acceptable in principle", "in principle|acceptable|agree", "en principio|aceptable|de acuerdo", 2),
          term("n23", "Draft contract", "draft|contract", "borrador|contrato", 3),
          date("n24", "By the 30th", "30", "30", 3),
          idea("n25", "Aim to sign before quarter end", "sign|end of the quarter|quarter", "firm|final del trimestre|trimestre", 2),
        ],
      },
      {
        en: "I want to stress that the volume commitment is conditional on all of these points; we cannot accept some and not others.",
        es: "Quiero subrayar que el compromiso de volumen depende de todos estos puntos; no podemos aceptar unos sí y otros no.",
        units: [
          idea("n26", "Volume commitment is conditional on all points", "condition|depend|all of these|package", "depend|condicion|todos estos", 3),
          idea("n27", "Cannot accept some and not others", "some and not|not others|all or nothing|pick", "unos si|otros no|todo o nada|no podemos aceptar", 3),
        ],
      },
    ],
  },
  {
    id: "legal-lease",
    subject: "legal",
    difficulty: 2,
    title: { en: "Tenant rights briefing", es: "Información sobre derechos del inquilino" },
    context: {
      en: "A legal aid attorney explains a lease dispute to a tenant.",
      es: "Una abogada de asistencia jurídica explica un conflicto de arrendamiento a una inquilina.",
    },
    segments: [
      {
        en: "Ms. Santos, I have read your lease. Your landlord cannot raise the rent before the lease ends on June 30th.",
        es: "Señora Santos, he leído su contrato. Su casero no puede subirle el alquiler antes de que termine el contrato el 30 de junio.",
        units: [
          name("r1", "Client: Ms. Santos", "santos"),
          term("r2", "Lease", "lease|contract|agreement", "contrato|arrendamiento", 2),
          idea("r3", "Landlord cannot raise the rent", "cannot raise|can t raise|not raise|can t increase|cannot increase|not allowed", "no puede subir|no puede aumentar|no le puede subir|no puede incrementar", 3),
          date("r4", "Lease ends June 30", "june 30|30 june|30th of june", "30 junio|30 de junio", 3),
        ],
      },
      {
        en: "The letter he sent you asks for 1,450 dollars a month, which is 200 dollars more than you pay now.",
        es: "La carta que le envió pide 1450 dólares al mes, que son 200 dólares más de lo que paga ahora.",
        units: [
          idea("r5", "The landlord's letter", "letter|notice", "carta|aviso|notific", 1),
          qty("r6", "$1,450 a month", 1450, 3, "dollar|month", "dolar|mes"),
          qty("r7", "$200 more than now", 200, 3, "more", "mas"),
        ],
      },
      {
        en: "You should keep paying your current rent on time, and keep every receipt.",
        es: "Usted debe seguir pagando su alquiler actual a tiempo y guardar todos los recibos.",
        units: [
          idea("r8", "Keep paying current rent on time", "keep pay|continue pay|on time|current rent", "seguir pagando|siga pagando|a tiempo|alquiler actual", 3),
          idea("r9", "Keep every receipt", "receipt", "recibo|comprobante", 3),
        ],
      },
      {
        en: "He also cannot enter your apartment without giving you at least 24 hours' notice, except in an emergency.",
        es: "Tampoco puede entrar en su apartamento sin avisarle con al menos 24 horas de antelación, salvo en caso de emergencia.",
        units: [
          idea("r10", "Cannot enter without notice", "enter|come in|notice", "entrar|aviso|avis", 3),
          num("r11", "At least 24 hours", 24, 3, "hour", "hora"),
          idea("r12", "Except in an emergency", "emergenc", "emergencia|urgencia", 3),
        ],
      },
      {
        en: "I will write to him this week. If he does not respond within 10 days, we can file a complaint with the housing board.",
        es: "Le escribiré esta semana. Si no responde en un plazo de 10 días, podemos presentar una queja ante la junta de vivienda.",
        units: [
          idea("r13", "Attorney will write this week", "write|letter|this week", "escrib|carta|esta semana", 2),
          num("r14", "Within 10 days", 10, 3, "day", "dia"),
          term("r15", "File a complaint with the housing board", "complaint|housing board|housing", "queja|denuncia|reclamac|junta de vivienda|vivienda", 3),
        ],
      },
    ],
  },
];

export function getLibraryPassage(id: string) {
  return LIBRARY.find((p) => p.id === id);
}
