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

  // Convertir Set a Array y ordenar por path para construir jerárquicamente
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
 * Busca el valor real para un path específico en los JSONs cargados
 * @param {string} path - Path de la propiedad (ej: "CustomerName", "Items[0].PartNumber")
 * @param {Array} validJSONs - Array de JSONs válidos
 * @returns {*} Valor encontrado o undefined
 */
const findValueForPath = (path, validJSONs) => {
  // Buscar en orden: primero en el primer JSON, luego en el segundo, etc.
  for (const json of validJSONs) {
    const value = getValueByPath(json.content, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  // Si no se encuentra, retornar un valor por defecto basado en el tipo
  return getDefaultValueForPath(path, validJSONs);
};

/**
 * Obtiene el valor de un objeto usando un path (ej: "Items[0].PartNumber")
 * @param {Object} obj - Objeto del cual extraer el valor
 * @param {string} path - Path de la propiedad
 * @returns {*} Valor encontrado o undefined
 */
const getValueByPath = (obj, path) => {
  if (!obj || typeof obj !== "object") return undefined;

  try {
    // Manejar arrays de objetos: Items[0].PartNumber
    if (path.includes("[0]")) {
      const parts = path.split(".");
      let current = obj;

      for (const part of parts) {
        if (part.includes("[0]")) {
          // Extraer el nombre del array: "Items[0]" -> "Items"
          const arrayName = part.replace("[0]", "");
          current = current[arrayName];

          if (Array.isArray(current) && current.length > 0) {
            current = current[0]; // Tomar el primer elemento
          } else {
            return undefined;
          }
        } else {
          current = current[part];
          if (current === undefined) return undefined;
        }
      }

      return current;
    } else {
      // Path simple: "CustomerName"
      return obj[path];
    }
  } catch (error) {
    return undefined;
  }
};

/**
 * Obtiene un valor por defecto cuando no se encuentra el valor real
 * @param {string} path - Path de la propiedad
 * @param {Array} validJSONs - Array de JSONs válidos para inferir tipo
 * @returns {*} Valor por defecto
 */
const getDefaultValueForPath = (path, validJSONs) => {
  // Intentar inferir el tipo basado en otros valores encontrados
  for (const json of validJSONs) {
    const value = getValueByPath(json.content, path);
    if (value !== undefined && value !== null) {
      return getDefaultValueByType(value);
    }
  }

  // Valores por defecto según el nombre del campo
  const lowerPath = path.toLowerCase();

  if (lowerPath.includes("number")) return "";
  if (lowerPath.includes("name")) return "";
  if (lowerPath.includes("address")) return "";
  if (lowerPath.includes("city")) return "";
  if (lowerPath.includes("state")) return "";
  if (lowerPath.includes("country")) return "";
  if (lowerPath.includes("code")) return "";
  if (lowerPath.includes("date")) return "";
  if (lowerPath.includes("quantity")) return 0;
  if (lowerPath.includes("line")) return "";
  if (lowerPath.includes("area")) return "";
  if (lowerPath.includes("location")) return "";
  if (lowerPath.includes("order")) return "";
  if (lowerPath.includes("class")) return "";
  if (lowerPath.includes("items")) return [];

  return "";
};

/**
 * Obtiene un valor por defecto basado en el tipo del valor original
 * @param {*} originalValue - Valor original para inferir el tipo
 * @returns {*} Valor por defecto del mismo tipo
 */
const getDefaultValueByType = (originalValue) => {
  if (typeof originalValue === "string") return "";
  if (typeof originalValue === "number") return 0;
  if (typeof originalValue === "boolean") return false;
  if (Array.isArray(originalValue)) return [];
  if (typeof originalValue === "object") return {};
  return "";
};

/**
 * Establece una propiedad anidada en un objeto usando un path
 * @param {Object} obj - Objeto donde establecer la propiedad
 * @param {string} path - Path de la propiedad
 * @param {*} value - Valor a establecer
 */
const setNestedProperty = (obj, path, value) => {
  // Manejar arrays: Items[0].PartNumber
  if (path.includes("[0]")) {
    const parts = path.split(".");
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (part.includes("[0]")) {
        // Es un array: "Items[0]"
        const arrayName = part.replace("[0]", "");

        if (!current[arrayName]) {
          current[arrayName] = [];
        }

        if (current[arrayName].length === 0) {
          current[arrayName].push({});
        }

        current = current[arrayName][0];
      } else {
        // Es una propiedad normal
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
  } else {
    // Path simple
    obj[path] = value;
  }
};

/**
 * Genera configuración de arrays para el template
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} Configuración de arrays
 */
export const generateArrayConfig = (selectedProperties, comparisonResult) => {
  const arrayConfig = {};

  Array.from(selectedProperties).forEach((path) => {
    if (path.includes("[0]")) {
      const arrayPath = path.split("[0]")[0];
      if (!arrayConfig[arrayPath]) {
        arrayConfig[arrayPath] = {
          count: 1, // Por defecto 1 elemento
          properties: [],
        };
      }
      arrayConfig[arrayPath].properties.push(path);
    }
  });

  return arrayConfig;
};

/**
 * Genera template con configuración de arrays personalizada
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Array} loadedJSONs - JSONs cargados
 * @param {Object} arrayConfig - Configuración de arrays {arrayPath: {count: number}}
 * @returns {Object} Template con arrays configurados
 */
export const generateTemplateWithArrays = (
  selectedProperties,
  loadedJSONs,
  arrayConfig = {}
) => {
  const baseTemplate = generateTemplate(selectedProperties, loadedJSONs);

  // Aplicar configuración de arrays
  Object.entries(arrayConfig).forEach(([arrayPath, config]) => {
    const arrayValue = getValueByPath(baseTemplate, arrayPath);

    if (Array.isArray(arrayValue) && arrayValue.length > 0) {
      const itemTemplate = arrayValue[0];
      const newArray = [];

      for (let i = 0; i < config.count; i++) {
        newArray.push({ ...itemTemplate });
      }

      setNestedProperty(baseTemplate, arrayPath, newArray);
    }
  });

  return baseTemplate;
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
