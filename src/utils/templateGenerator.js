// src/utils/templateGenerator.js

/**
 * CORREGIDO: Genera template JSON usando EXACTAMENTE las propiedades seleccionadas
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

  // CORREGIDO: Construir template de forma SELECTIVA
  return buildSelectiveTemplate(selectedProperties, validJSONs);
};

/**
 * NUEVA: Construye template de forma selectiva, SOLO con propiedades seleccionadas
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Array} validJSONs - JSONs válidos
 * @returns {Object} Template construido selectivamente
 */
const buildSelectiveTemplate = (selectedProperties, validJSONs) => {
  const template = {};
  const selectedPaths = Array.from(selectedProperties).sort();

  // CLAVE: Procesar cada propiedad individualmente
  selectedPaths.forEach((path) => {
    const value = findValueForPath(path, validJSONs);
    if (value !== undefined) {
      // CORREGIDO: Solo establecer esta propiedad específica
      setSelectiveProperty(template, path, value, selectedProperties);
    }
  });

  return template;
};

/**
 * NUEVA: Establece SOLO la propiedad específica sin crear hermanos no seleccionados
 * @param {Object} template - Template en construcción
 * @param {string} targetPath - Path específico a establecer
 * @param {*} value - Valor a establecer
 * @param {Set} selectedProperties - Propiedades seleccionadas (para validación)
 */
const setSelectiveProperty = (
  template,
  targetPath,
  value,
  selectedProperties
) => {
  const parts = targetPath.split(".");
  let current = template;

  // Navegar/crear la estructura SOLO hasta el padre directo
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (part.includes("[0]")) {
      // Manejar arrays
      const arrayName = part.replace("[0]", "");

      // Solo crear el array si no existe
      if (!current[arrayName]) {
        current[arrayName] = [];
      }

      // Solo crear el primer elemento si no existe
      if (current[arrayName].length === 0) {
        current[arrayName].push({});
      }

      current = current[arrayName][0];
    } else {
      // Manejar objetos normales
      // CLAVE: Solo crear el objeto si no existe, NO copiar propiedades existentes
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  // Establecer SOLO la propiedad final
  const finalPart = parts[parts.length - 1];

  if (finalPart.includes("[0]")) {
    const arrayName = finalPart.replace("[0]", "");
    if (!current[arrayName]) {
      current[arrayName] = [];
    }
    if (current[arrayName].length === 0) {
      current[arrayName].push(value);
    }
  } else {
    // CRÍTICO: Solo establecer esta propiedad específica
    current[finalPart] = value;
  }
};

/**
 * MEJORADA: Busca valor con cascada de archivos y fallback robusto
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

  // Si no se encuentra en ningún archivo, retornar placeholder inteligente
  return getSmartPlaceholder(path);
};

/**
 * MEJORADA: Obtiene valor de un objeto usando path con manejo robusto de arrays
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
 * MEJORADA: Genera placeholder inteligente basado en el path y tipo esperado
 * @param {string} path - Path de la propiedad
 * @returns {*} Valor placeholder apropiado
 */
const getSmartPlaceholder = (path) => {
  const lowerPath = path.toLowerCase();

  // Placeholders específicos según contexto del path
  if (lowerPath.includes("email")) return "example@domain.com";
  if (lowerPath.includes("phone") || lowerPath.includes("phonenumber"))
    return "9012345678";
  if (lowerPath.includes("date") || lowerPath.includes("timestamp"))
    return "2024-01-01";
  if (lowerPath.includes("amount") || lowerPath.includes("value")) return 100;
  if (lowerPath.includes("currency")) return "USD";
  if (lowerPath.includes("code")) return "CODE123";
  if (lowerPath.includes("number") || lowerPath.includes("accountnumber"))
    return "123456789";
  if (lowerPath.includes("address") || lowerPath.includes("street"))
    return "123 Main St";
  if (lowerPath.includes("city")) return "New York";
  if (lowerPath.includes("state") || lowerPath.includes("stateorprovince"))
    return "NY";
  if (lowerPath.includes("country")) return "US";
  if (lowerPath.includes("postal") || lowerPath.includes("zip")) return "10001";
  if (lowerPath.includes("name") || lowerPath.includes("personname"))
    return "John Doe";
  if (lowerPath.includes("company")) return "Company Inc";
  if (lowerPath.includes("type")) return "TYPE";
  if (lowerPath.includes("description")) return "Description";
  if (lowerPath.includes("weight")) return { value: 1, units: "LB" };
  if (lowerPath.includes("dimension"))
    return { length: 5, width: 5, height: 5, units: "IN" };
  if (lowerPath.includes("count")) return 1;
  if (lowerPath.includes("units")) return "PCS";

  // Placeholder por defecto para strings
  return "placeholder_value";
};

/**
 * CORREGIDA: Detecta arrays reales basándose SOLO en propiedades seleccionadas
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} Configuración de arrays reales
 */
export const generateArrayConfig = (selectedProperties, comparisonResult) => {
  const arrayConfig = {};
  const detectedArrays = new Set();

  // CORREGIDO: Solo detectar arrays que tienen propiedades seleccionadas
  Array.from(selectedProperties).forEach((path) => {
    if (path.includes("[0]")) {
      // Extraer el path del array padre
      const pathParts = path.split("[0]");
      if (pathParts.length >= 2) {
        const arrayFullPath = pathParts[0];
        const cleanArrayPath = arrayFullPath.replace(/\.$/, "");
        detectedArrays.add(cleanArrayPath);
      }
    }
  });

  // Crear configuración solo para arrays que tienen hijos seleccionados
  detectedArrays.forEach((arrayPath) => {
    const relatedProperties = Array.from(selectedProperties).filter((prop) =>
      prop.startsWith(arrayPath + "[0].")
    );

    // Solo incluir si hay propiedades seleccionadas dentro del array
    if (relatedProperties.length > 0) {
      arrayConfig[arrayPath] = {
        count: 2, // Por defecto 2 elementos
        properties: relatedProperties,
      };
    }
  });

  return arrayConfig;
};

/**
 * CORREGIDA: Genera template con arrays expandidos basado en selección exacta
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
  // CAMBIO: Usar buildSelectiveTemplate directamente
  const baseTemplate = buildSelectiveTemplate(selectedProperties, loadedJSONs);

  // Expandir arrays solo si están configurados Y tienen propiedades seleccionadas
  Object.entries(arrayConfig).forEach(([arrayPath, config]) => {
    if (config.properties && config.properties.length > 0) {
      expandArraySelectively(
        baseTemplate,
        arrayPath,
        config.count,
        config.properties,
        loadedJSONs
      );
    }
  });

  return baseTemplate;
};

/**
 * NUEVA: Expande array SELECTIVAMENTE - solo propiedades específicamente seleccionadas
 * @param {Object} template - Template base
 * @param {string} arrayPath - Path del array a expandir
 * @param {number} count - Cantidad de elementos deseados
 * @param {Array} selectedArrayProperties - Propiedades seleccionadas del array
 * @param {Array} loadedJSONs - JSONs para cascada de datos
 */
const expandArraySelectively = (
  template,
  arrayPath,
  count,
  selectedArrayProperties,
  loadedJSONs
) => {
  if (!arrayPath || count < 1 || !selectedArrayProperties.length) return;

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
    if (current[finalArrayName] && Array.isArray(current[finalArrayName])) {
      const newArray = createSelectiveArrayElements(
        arrayPath,
        count,
        selectedArrayProperties,
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
          selectedArrayProperties,
          loadedJSONs
        );
        current[key] = newArray;
      }
    });
  }
};

/**
 * NUEVA: Crea elementos de array con SOLO propiedades seleccionadas
 * @param {string} arrayPath - Path del array
 * @param {number} count - Cantidad de elementos
 * @param {Array} selectedArrayProperties - Propiedades seleccionadas del array
 * @param {Array} loadedJSONs - JSONs para cascada de datos
 * @returns {Array} Array con elementos que contienen solo propiedades seleccionadas
 */
const createSelectiveArrayElements = (
  arrayPath,
  count,
  selectedArrayProperties,
  loadedJSONs
) => {
  const elements = [];

  for (let i = 0; i < count; i++) {
    const element = {};

    // CLAVE: Para cada propiedad ESPECÍFICAMENTE seleccionada del array
    selectedArrayProperties.forEach((fullPath) => {
      // Extraer la propiedad relativa dentro del elemento del array
      const arrayPrefix = arrayPath ? `${arrayPath}[0].` : "[0].";
      const relativePath = fullPath.replace(arrayPrefix, "");

      // Buscar el valor con cascada
      const value = findValueForPath(fullPath, loadedJSONs);

      // CRÍTICO: Establecer SOLO esta propiedad específica en el elemento
      if (value !== undefined) {
        setSelectivePropertyInElement(element, relativePath, value);
      }
    });

    elements.push(element);
  }

  return elements;
};

/**
 * NUEVA: Establece propiedad específica en elemento de array SIN crear hermanos
 * @param {Object} element - Elemento del array destino
 * @param {string} relativePath - Path relativo dentro del elemento
 * @param {*} value - Valor a establecer
 */
const setSelectivePropertyInElement = (element, relativePath, value) => {
  const parts = relativePath.split(".");
  let current = element;

  // Crear estructura mínima necesaria
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Solo crear el objeto si no existe, NO copiar propiedades
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  // Establecer SOLO la propiedad final
  const finalPart = parts[parts.length - 1];
  current[finalPart] = value;
};

/**
 * Formatea el JSON para visualización
 * @param {Object} template - Template a formatear
 * @returns {string} JSON formateado
 */
export const formatTemplate = (template) => {
  try {
    return JSON.stringify(template, null, 2);
  } catch (error) {
    return '{\n  "error": "Invalid template structure"\n}';
  }
};

/**
 * MEJORADA: Obtiene estadísticas detalladas del template generado
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
    depth: 0,
    estimatedSize: 0,
  };

  const countProperties = (obj, path = "", currentDepth = 0) => {
    stats.depth = Math.max(stats.depth, currentDepth);

    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      stats.totalProperties++;

      if (Array.isArray(value)) {
        stats.arrayProperties++;
        stats.arrayItemsCount[currentPath] = value.length;

        if (
          value.length > 0 &&
          typeof value[0] === "object" &&
          value[0] !== null
        ) {
          countProperties(value[0], `${currentPath}[0]`, currentDepth + 1);
        }
      } else if (typeof value === "object" && value !== null) {
        stats.objectProperties++;
        countProperties(value, currentPath, currentDepth + 1);
      } else {
        stats.primitiveProperties++;
      }
    });
  };

  if (template && typeof template === "object") {
    countProperties(template);
    stats.estimatedSize = JSON.stringify(template).length;
  }

  return stats;
};

/**
 * NUEVA: Valida que el template generado sea JSON válido
 * @param {Object} template - Template a validar
 * @returns {Object} Resultado de validación
 */
export const validateTemplate = (template) => {
  try {
    // Verificar que es un objeto válido
    if (!template || typeof template !== "object") {
      return {
        isValid: false,
        errors: ["Template must be a valid object"],
        warnings: [],
      };
    }

    // Verificar que se puede serializar a JSON
    const jsonString = JSON.stringify(template);
    JSON.parse(jsonString);

    // Verificar estructura básica
    const warnings = [];
    if (Object.keys(template).length === 0) {
      warnings.push("Template is empty");
    }

    return {
      isValid: true,
      errors: [],
      warnings,
      size: jsonString.length,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error.message],
      warnings: [],
    };
  }
};

/**
 * NUEVA: Obtiene información detallada sobre las propiedades seleccionadas
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} Información detallada
 */
export const getSelectionInfo = (selectedProperties, comparisonResult) => {
  const info = {
    totalSelected: selectedProperties.size,
    byType: {},
    byLevel: {},
    requiredCount: 0,
    optionalCount: 0,
    arrayRelated: 0,
  };

  Array.from(selectedProperties).forEach((path) => {
    if (comparisonResult[path]) {
      const property = comparisonResult[path];

      // Por tipo
      info.byType[property.type] = (info.byType[property.type] || 0) + 1;

      // Por nivel
      info.byLevel[property.level] = (info.byLevel[property.level] || 0) + 1;

      // Requeridas vs opcionales
      if (property.isRequired) {
        info.requiredCount++;
      } else {
        info.optionalCount++;
      }

      // Arrays
      if (path.includes("[0]")) {
        info.arrayRelated++;
      }
    }
  });

  return info;
};

/**
 * NUEVA: Función de debug para verificar exactitud del template
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Object} generatedTemplate - Template generado
 * @returns {Object} Reporte de exactitud
 */
export const debugTemplateAccuracy = (
  selectedProperties,
  generatedTemplate
) => {
  const selectedPaths = Array.from(selectedProperties);
  const templatePaths = extractAllPathsFromTemplate(generatedTemplate);

  const missing = selectedPaths.filter((path) => !templatePaths.includes(path));
  const extra = templatePaths.filter((path) => !selectedPaths.includes(path));

  return {
    selectedCount: selectedPaths.length,
    templateCount: templatePaths.length,
    missing,
    extra,
    isExact: missing.length === 0 && extra.length === 0,
    accuracy:
      selectedPaths.length > 0
        ? (
            ((selectedPaths.length - missing.length) / selectedPaths.length) *
            100
          ).toFixed(1)
        : 0,
  };
};

/**
 * NUEVA: Extrae todos los paths de un template generado
 * @param {Object} template - Template para analizar
 * @param {string} currentPath - Path actual (para recursión)
 * @returns {Array} Array de todos los paths en el template
 */
const extractAllPathsFromTemplate = (template, currentPath = "") => {
  const paths = [];

  if (!template || typeof template !== "object") return paths;

  Object.keys(template).forEach((key) => {
    const path = currentPath ? `${currentPath}.${key}` : key;
    paths.push(path);

    if (
      Array.isArray(template[key]) &&
      template[key].length > 0 &&
      typeof template[key][0] === "object"
    ) {
      // Para arrays, agregar paths con [0]
      const arrayPaths = extractAllPathsFromTemplate(
        template[key][0],
        `${path}[0]`
      );
      paths.push(...arrayPaths);
    } else if (typeof template[key] === "object" && template[key] !== null) {
      const nestedPaths = extractAllPathsFromTemplate(template[key], path);
      paths.push(...nestedPaths);
    }
  });

  return paths;
};
