// Agentes del negocio: qué son y qué devuelve cada uno al terminar de trabajar.
// Archivo compartido entre el servidor (que los ejecuta) y la página /agentes (que los muestra).

export type IdAgente = "reposicion" | "ventas" | "catalogo" | "logs" | "marketing" | "costos" | "revendedores" | "compras" | "tendencias" | "experiencia";

/** Agentes que trabajan en el navegador (logs lee los registros de esta compu; experiencia prueba las páginas como un usuario) */
export type IdAgenteNavegador = "logs" | "experiencia";
/** Agentes que trabajan en el servidor con los datos de la base */
export type IdAgenteServidor = Exclude<IdAgente, IdAgenteNavegador>;

export const AGENTES: { id: IdAgente; nombre: string; rol: string; descripcion: string; color: string }[] = [
    {
        id: "reposicion",
        nombre: "Reposición",
        rol: "Cuida que no te quedes sin stock",
        descripcion: "Revisa los perfumes hechos, los insumos y las esencias, y cruza con lo que se vende para avisarte qué preparar o comprar.",
        color: "#7D9878",
    },
    {
        id: "ventas",
        nombre: "Ventas y números",
        rol: "Te cuenta cómo viene el negocio",
        descripcion: "Mira lo que entró, lo compara con el mes anterior, calcula la ganancia y te muestra qué se vende y qué rinde más.",
        color: "#C9A877",
    },
    {
        id: "catalogo",
        nombre: "Catálogo",
        rol: "Revisa lo que ven tus clientes",
        descripcion: "Busca productos sin foto, sin precio o sin notas, y precios que te hacen perder plata.",
        color: "#C9866F",
    },
    {
        id: "logs",
        nombre: "Logs",
        rol: "Vigila errores y actividad del sistema",
        descripcion: "Lee los registros del sistema guardados en esta compu, busca errores (sobre todo los que se repiten) y te cuenta qué se movió y cuándo.",
        color: "#6F8C9A",
    },
    {
        id: "marketing",
        nombre: "Marketing",
        rol: "Te dice qué promocionar y a quién escribirle",
        descripcion: "Busca lo que conviene publicar (se vende, tiene foto y hay stock), el stock que no se mueve y los clientes a los que conviene volver a escribirles.",
        color: "#A07A92",
    },
    {
        id: "costos",
        nombre: "Costos y precios",
        rol: "Cuida que cada venta te deje ganancia",
        descripcion: "Recalcula el costo de cada perfume con el dólar y los precios de hoy, te avisa cuáles quedaron con poco margen y te propone un precio nuevo.",
        color: "#A08A5C",
    },
    {
        id: "revendedores",
        nombre: "Revendedores",
        rol: "Sigue a tus clientes mayoristas",
        descripcion: "Mira quién te compra más por mayor, quién dejó de comprar, qué se mueve mejor en la lista mayorista y las solicitudes sin responder.",
        color: "#B5835A",
    },
    {
        id: "compras",
        nombre: "Compras",
        rol: "Te arma la lista de compras",
        descripcion: "Junta lo que hay que reponer, lo agrupa por proveedor, busca quién lo tiene más barato y te dice cuánto vas gastando.",
        color: "#6D7FA6",
    },
    {
        id: "tendencias",
        nombre: "Tendencias",
        rol: "Te dice qué viene creciendo",
        descripcion: "Con tus propias ventas: qué perfumes vienen subiendo, cuáles se frenaron y qué familias de aromas y tamaños prefieren tus clientes.",
        color: "#4F8F84",
    },
    {
        id: "experiencia",
        nombre: "Experiencia de usuario",
        rol: "Prueba la página como lo haría un cliente",
        descripcion: "Entra a cada página del sistema y del catálogo, mide cuánto tarda, revisa que las fotos carguen y no pesen de más, y te propone qué mejorar.",
        color: "#8C6BB1",
    },
];

/**
 * Cada agente es líder de su área y tiene dos asistentes (mini IA) que se reparten su trabajo:
 * cada uno hace una parte de la revisión en paralelo y le pasa lo suyo al líder, que lo junta.
 */
export const ASISTENTES: Record<IdAgente, [{ nombre: string; tarea: string }, { nombre: string; tarea: string }]> = {
    reposicion: [
        { nombre: "Conteo", tarea: "Cuenta perfumes hechos y esencias" },
        { nombre: "Compras", tarea: "Revisa insumos y qué hay que comprar" },
    ],
    ventas: [
        { nombre: "Caja", tarea: "Suma lo que entró y lo que falta cobrar" },
        { nombre: "Análisis", tarea: "Calcula ganancia y lo que más se vende" },
    ],
    catalogo: [
        { nombre: "Fichas", tarea: "Busca productos sin foto, precio o notas" },
        { nombre: "Precios", tarea: "Compara cada precio con su costo" },
    ],
    logs: [
        { nombre: "Lector", tarea: "Lee los registros de la semana" },
        { nombre: "Detective", tarea: "Agrupa errores repetidos e ingresos fallidos" },
    ],
    marketing: [
        { nombre: "Vidriera", tarea: "Busca qué conviene promocionar y el stock quieto" },
        { nombre: "Clientes", tarea: "Encuentra clientes para volver a escribirles" },
    ],
    costos: [
        { nombre: "Calculadora", tarea: "Recalcula el costo de cada perfume con los precios de hoy" },
        { nombre: "Márgenes", tarea: "Compara cada precio con su costo y propone precios" },
    ],
    revendedores: [
        { nombre: "Cuentas", tarea: "Suma lo que compra cada mayorista" },
        { nombre: "Seguimiento", tarea: "Detecta quién dejó de comprar y las solicitudes pendientes" },
    ],
    compras: [
        { nombre: "Lista", tarea: "Junta lo que hay que reponer, por proveedor" },
        { nombre: "Comparador", tarea: "Busca qué proveedor lo tiene más barato" },
    ],
    tendencias: [
        { nombre: "Radar", tarea: "Detecta qué viene creciendo y qué se frenó" },
        { nombre: "Aromas", tarea: "Mira qué familias de aromas y tamaños se eligen más" },
    ],
    experiencia: [
        { nombre: "Navegador", tarea: "Entra a cada página y mide cuánto tarda" },
        { nombre: "Fotos", tarea: "Revisa que las fotos del catálogo carguen y no pesen de más" },
    ],
};

/** Lo que hizo cada asistente en la última revisión (en el mismo orden que ASISTENTES) */
export type TrabajoAsistente = { nombre: string; hizo: string };

/**
 * Cuando un agente encuentra algo que toca el trabajo de otros, arma un equipo por su cuenta:
 * los llama, se juntan en una sala de reuniones y dejan una propuesta en conjunto.
 */
export type Equipo = {
    con: IdAgente[];
    motivo: string;
    propuesta: string;
};

/** urgente = hay que hacer algo ya · atencion = conviene mirarlo · bien = todo en orden · dato = para saber */
export type NivelHallazgo = "urgente" | "atencion" | "bien" | "dato";

export type Hallazgo = {
    nivel: NivelHallazgo;
    titulo: string;
    detalle?: string;
    /** Ejemplos concretos (hasta 6) */
    items?: string[];
    /** A dónde ir para resolverlo */
    accion?: { texto: string; href: string };
};

/** Propuesta de mejora que arma cada agente para su área a partir de lo que analizó */
export type Propuesta = {
    impacto: "alto" | "medio" | "bajo";
    /** Qué hacer, dicho como una acción */
    titulo: string;
    /** Por qué, con los datos que lo justifican */
    porque: string;
    accion?: { texto: string; href: string };
};

/** Datos de la cuenta de Instagram (solo si está conectada) */
export type PublicacionIG = { tipo: string; texto: string; fecha: string; meGusta: number; comentarios: number; link: string };
export type DatosInstagram = { usuario: string; seguidores: number; publicaciones: number; ultimas: PublicacionIG[] };

export type Metrica = {
    etiqueta: string;
    valor: string;
    detalle?: string;
    tono?: "salvia" | "terracota" | "arena" | "neutro";
};

export type ResultadoAgente = {
    agente: IdAgente;
    /** Lo que fue haciendo, en orden (se muestra como una bitácora) */
    pasos: string[];
    metricas: Metrica[];
    hallazgos: Hallazgo[];
    /** Equipo que decidió armar con otros agentes (si hizo falta) */
    equipo?: Equipo | null;
    /** Lo que hizo cada uno de sus dos asistentes (mini IA) */
    asistentes?: TrabajoAsistente[];
    /** Propuestas de mejora para su área, de la más importante a la menos */
    propuestas?: Propuesta[];
    /** Resumen escrito por la IA (solo si está conectada) */
    resumenIA: string | null;
    ejecutadoEn: string;
    duracionMs: number;
};
