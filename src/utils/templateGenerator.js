// src/utils/templateGenerator.js

/**
 * Genera un template JSON usando datos reales de los JSONs cargados
 * @param {Set} selectedProperties - Propiedades seleccionadas por el usuario
 * @param {Array} loadedJSONs - Array de JSONs cargados
 * @param {Object} comparisonResult - Resultado de la comparación
 * @returns {Object} Template JSON con datos reales
 */
export const generateTemplate = (
  selectedProperties,
  loadedJSONs,
  comparisonResult
) => {
  if (!selectedProperties || selectedProperties.size === 0) {
    return {};
  }

  if (!loadedJSONs || loadedJSONs.length === 0) {
    return {};
  }

  // Filtrar solo JSONs válidos
  const validJSONs = loadedJSONs.filter((json) => json.valid && json.content);

  if (validJSONs.length === 0) {
    return {};
  }

  // Convertir Set a Array y ordenar por path
  const selectedPaths = Array.from(selectedProperties).sort();

  // Construir el template
  const template = {};

  selectedPaths.forEach((path) => {
    const value = findValueForPath(path, validJSONs);
    if (value !== undefined) {
      setNestedProperty(template, path, value);
    }
  });

  return template;
};

/**
 * NUEVA: Busca valor con cascada de archivos (primero → segundo → tercero)
 * @param {string} path - Path de la propiedad
 * @param {Array} validJSONs - Array de JSONs válidos ordenados por prioridad
 * @returns {*} Valor encontrado o placeholder
 */
const findValueForPath = (path, validJSONs) => {
  // Cascada: buscar en orden de prioridad de archivos
  for (const json of validJSONs) {
    const value = getValueByPath(json.content, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  // Si no se encuentra en ningún archivo, retornar placeholder
  return getPlaceholderByPath(path);
};

/**
 * Obtiene el valor de un objeto usando un path
 * @param {Object} obj - Objeto del cual extraer el valor
 * @param {string} path - Path de la propiedad
 * @returns {*} Valor encontrado o undefined
 */
const getValueByPath = (obj, path) => {
  if (!obj || typeof obj !== "object") return undefined;

  try {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (part.includes("[0]")) {
        // Array: extraer nombre y acceder al primer elemento
        const arrayName = part.replace("[0]", "");
        current = current[arrayName];

        if (Array.isArray(current) && current.length > 0) {
          current = current[0];
        } else {
          return undefined;
        }
      } else {
        // Propiedad normal
        current = current[part];
        if (current === undefined) return undefined;
      }
    }

    return current;
  } catch (error) {
    return undefined;
  }
};

/**
 * Genera placeholder basado en el path
 * @param {string} path - Path de la propiedad
 * @returns {*} Valor placeholder apropiado
 */
const getPlaceholderByPath = (path) => {
  const lowerPath = path.toLowerCase();

  // Placeholders específicos según tipo de campo
  if (lowerPath.includes("email")) return "example@domain.com";
  if (lowerPath.includes("phone")) return "1234567890";
  if (lowerPath.includes("date")) return "2024-01-01";
  if (lowerPath.includes("amount") || lowerPath.includes("value")) return 0;
  if (lowerPath.includes("currency")) return "USD";
  if (lowerPath.includes("code")) return "CODE";
  if (lowerPath.includes("number")) return "123456789";
  if (lowerPath.includes("address") || lowerPath.includes("street")) return "";
  if (lowerPath.includes("city")) return "City";
  if (lowerPath.includes("state")) return "State";
  if (lowerPath.includes("country")) return "US";
  if (lowerPath.includes("name")) return "Name";

  return "";
};

/**
 * Establece una propiedad anidada en un objeto
 * @param {Object} obj - Objeto donde establecer la propiedad
 * @param {string} path - Path de la propiedad
 * @param {*} value - Valor a establecer
 */
const setNestedProperty = (obj, path, value) => {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (part.includes("[0]")) {
      // Array: crear estructura de array
      const arrayName = part.replace("[0]", "");

      if (!current[arrayName]) {
        current[arrayName] = [];
      }

      if (current[arrayName].length === 0) {
        current[arrayName].push({});
      }

      current = current[arrayName][0];
    } else {
      // Propiedad normal
      if (isLast) {
        current[part] = value;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }
};

/**
 * CORREGIDA: Detecta solo arrays reales del JSON
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} Configuración de arrays reales
 */
export const generateArrayConfig = (selectedProperties, comparisonResult) => {
  const arrayConfig = {};
  const detectedArrays = new Set();

  // Detectar arrays reales analizando las propiedades seleccionadas
  Array.from(selectedProperties).forEach((path) => {
    if (path.includes("[0]")) {
      // Extraer el path completo del array
      const pathParts = path.split("[0]");
      if (pathParts.length >= 2) {
        // El array está en pathParts[0], puede incluir path anidado
        const arrayFullPath = pathParts[0];
        detectedArrays.add(arrayFullPath);
      }
    }
  });

  // Crear configuración para cada array detectado
  detectedArrays.forEach((arrayPath) => {
    const cleanPath = arrayPath.replace(/\.$/, ""); // Remover punto final si existe
    arrayConfig[cleanPath] = {
      count: 2, // Por defecto 2 elementos
      properties: Array.from(selectedProperties).filter((prop) =>
        prop.startsWith(arrayPath)
      ),
    };
  });

  return arrayConfig;
};

/**
 * CORREGIDA: Expande solo arrays específicos con propiedades seleccionadas
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Array} loadedJSONs - JSONs cargados
 * @param {Object} arrayConfig - Configuración de arrays
 * @returns {Object} Template con arrays expandidos
 */
export const generateTemplateWithArrays = (
  selectedProperties,
  loadedJSONs,
  arrayConfig = {}
) => {
  const baseTemplate = generateTemplate(selectedProperties, loadedJSONs);

  // Expandir cada array específico según configuración
  Object.entries(arrayConfig).forEach(([arrayPath, config]) => {
    expandSpecificArraySelective(
      baseTemplate,
      arrayPath,
      config.count,
      selectedProperties,
      loadedJSONs
    );
  });

  return baseTemplate;
};

/**
 * NUEVA: Expande array con solo propiedades específicamente seleccionadas
 * @param {Object} template - Template base
 * @param {string} arrayPath - Path del array a expandir
 * @param {number} count - Cantidad de elementos deseados
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Array} loadedJSONs - JSONs para cascada de datos
 */
const expandSpecificArraySelective = (
  template,
  arrayPath,
  count,
  selectedProperties,
  loadedJSONs
) => {
  if (!arrayPath || count < 1) return;

  // Navegar hasta el array usando el path
  const pathParts = arrayPath === "" ? [] : arrayPath.split(".");
  let current = template;

  // Navegar hasta el contenedor del array
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!current[part]) return; // Array no existe
    current = current[part];
  }

  // Obtener el nombre final del array
  const finalArrayName =
    pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;

  if (finalArrayName) {
    // Array anidado
    if (
      current[finalArrayName] &&
      Array.isArray(current[finalArrayName]) &&
      current[finalArrayName].length > 0
    ) {
      // NUEVO: Solo usar propiedades específicamente seleccionadas
      const newArray = createSelectiveArrayElements(
        arrayPath,
        count,
        selectedProperties,
        loadedJSONs
      );
      current[finalArrayName] = newArray;
    }
  } else {
    // Arrays en nivel raíz
    Object.keys(current).forEach((key) => {
      if (Array.isArray(current[key]) && current[key].length > 0) {
        const newArray = createSelectiveArrayElements(
          key,
          count,
          selectedProperties,
          loadedJSONs
        );
        current[key] = newArray;
      }
    });
  }
};

/**
 * NUEVA: Crea elementos de array con solo propiedades seleccionadas
 * @param {string} arrayPath - Path del array
 * @param {number} count - Cantidad de elementos
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Array} loadedJSONs - JSONs para cascada de datos
 * @returns {Array} Array con elementos que contienen solo propiedades seleccionadas
 */
const createSelectiveArrayElements = (
  arrayPath,
  count,
  selectedProperties,
  loadedJSONs
) => {
  const elements = [];

  // Buscar todas las propiedades seleccionadas que pertenecen a este array
  const arrayProperties = Array.from(selectedProperties).filter(
    (prop) =>
      prop.includes(`${arrayPath}[0].`) ||
      (arrayPath === "" && prop.includes("[0]."))
  );

  for (let i = 0; i < count; i++) {
    const element = {};

    // Para cada propiedad del array, extraer solo el valor específico
    arrayProperties.forEach((fullPath) => {
      // Extraer la propiedad relativa dentro del elemento del array
      const arrayPrefix = arrayPath ? `${arrayPath}[0].` : "[0].";
      const relativePath = fullPath.replace(arrayPrefix, "");

      // Buscar el valor con cascada
      const value = findValueForPath(fullPath, loadedJSONs);

      // Establecer la propiedad en el elemento
      if (value !== undefined) {
        setNestedPropertyInObject(element, relativePath, value);
      }
    });

    elements.push(element);
  }

  return elements;
};

/**
 * NUEVA: Establece propiedad anidada en un objeto simple (sin arrays)
 * @param {Object} obj - Objeto destino
 * @param {string} path - Path relativo
 * @param {*} value - Valor a establecer
 */
const setNestedPropertyInObject = (obj, path, value) => {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (isLast) {
      current[part] = value;
    } else {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }
};

/**
 * Formatea el JSON para visualización
 * @param {Object} template - Template a formatear
 * @returns {string} JSON formateado
 */
export const formatTemplate = (template) => {
  return JSON.stringify(template, null, 2);
};

/**
 * Obtiene estadísticas del template generado
 * @param {Object} template - Template generado
 * @returns {Object} Estadísticas del template
 */
export const getTemplateStats = (template) => {
  const stats = {
    totalProperties: 0,
    arrayProperties: 0,
    objectProperties: 0,
    primitiveProperties: 0,
    arrayItemsCount: {},
  };

  const countProperties = (obj, path = "") => {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      stats.totalProperties++;

      if (Array.isArray(value)) {
        stats.arrayProperties++;
        stats.arrayItemsCount[currentPath] = value.length;

        if (value.length > 0 && typeof value[0] === "object") {
          countProperties(value[0], `${currentPath}[0]`);
        }
      } else if (typeof value === "object" && value !== null) {
        stats.objectProperties++;
        countProperties(value, currentPath);
      } else {
        stats.primitiveProperties++;
      }
    });
  };

  countProperties(template);
  return stats;
};
