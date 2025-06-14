// src/utils/jsonComparator.js

/**
 * Algoritmo principal para comparar múltiples estructuras JSON
 * @param {Array} jsonArray - Array de objetos JSON con {id, name, content}
 * @returns {Object} Estructura de comparación jerárquica
 */
export const mergeJSONStructures = (jsonArray) => {
  if (!jsonArray || jsonArray.length === 0) {
    return null;
  }

  // Filtrar solo JSONs válidos
  const validJSONs = jsonArray.filter(json => json.valid && json.content);
  
  if (validJSONs.length === 0) {
    return null;
  }

  const totalJSONs = validJSONs.length;
  const propertyMap = new Map();

  // 1. Recorrer todos los JSONs y extraer propiedades
  validJSONs.forEach((json) => {
    traverseObject(json.content, '', (path, value, key, level) => {
      if (!propertyMap.has(path)) {
        propertyMap.set(path, {
          path,
          key,
          level,
          type: null,
          frequency: 0,
          values: [],
          sources: [],
          missing: [],
          examples: [],
          conflicts: []
        });
      }

      const property = propertyMap.get(path);
      
      // Registrar aparición
      property.sources.push(json.name);
      property.frequency++;
      property.values.push(value);
      
      // Detectar tipo y conflictos
      const currentType = detectType(value);
      if (property.type === null) {
        property.type = currentType;
      } else if (property.type !== currentType) {
        property.type = 'mixed';
        property.conflicts.push({
          source: json.name,
          expectedType: property.type,
          actualType: currentType,
          value: value
        });
      }

      // Guardar ejemplos (máximo 3 por propiedad)
      if (property.examples.length < 3) {
        property.examples.push({
          source: json.name,
          value: value,
          type: currentType
        });
      }
    });
  });

  // 2. Calcular propiedades faltantes y estadísticas
  const result = {};
  propertyMap.forEach((property, path) => {
    // Identificar fuentes donde falta la propiedad
    property.missing = validJSONs
      .filter(json => !property.sources.includes(json.name))
      .map(json => json.name);

    // Calcular estadísticas
    property.isRequired = property.frequency === totalJSONs;
    property.frequencyText = `${property.frequency}/${totalJSONs}`;
    property.frequencyPercent = Math.round((property.frequency / totalJSONs) * 100);

    // Determinar status
    property.status = getPropertyStatus(property);

    result[path] = property;
  });

  // 3. Construir estructura jerárquica
  return buildHierarchicalStructure(result);
};

/**
 * Recorre recursivamente un objeto JSON
 * @param {*} obj - Objeto a recorrer
 * @param {string} currentPath - Path actual
 * @param {Function} callback - Función llamada por cada propiedad
 */
const traverseObject = (obj, currentPath, callback) => {
  if (obj === null || obj === undefined) {
    return;
  }

  const level = currentPath ? currentPath.split('.').length : 0;

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    // Objeto normal
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const path = currentPath ? `${currentPath}.${key}` : key;
      
      callback(path, value, key, level);
      
      // Recursión para objetos anidados
      if (typeof value === 'object' && value !== null) {
        traverseObject(value, path, callback);
      }
    });
  } else if (Array.isArray(obj) && obj.length > 0) {
    // Array con elementos
    const firstElement = obj[0];
    if (typeof firstElement === 'object' && firstElement !== null) {
      // Array de objetos - analizar estructura del primer elemento
      const arrayPath = currentPath + '[0]';
      traverseObject(firstElement, arrayPath, callback);
    }
  }
};

/**
 * Detecta el tipo de dato de un valor
 * @param {*} value - Valor a analizar
 * @returns {string} Tipo detectado
 */
const detectType = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') {
    // Detectar subtipos de string
    if (isDateString(value)) return 'date';
    if (isEmailString(value)) return 'email';
    if (isUrlString(value)) return 'url';
    return 'string';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return typeof value;
};

/**
 * Determina el status de una propiedad basado en su frecuencia
 * @param {Object} property - Propiedad a evaluar
 * @returns {string} Status de la propiedad
 */
const getPropertyStatus = (property) => {
  if (property.isRequired) return 'required';
  if (property.frequency === 1) return 'rare';
  if (property.frequencyPercent >= 75) return 'common';
  if (property.frequencyPercent >= 50) return 'occasional';
  return 'rare';
};

/**
 * Construye estructura jerárquica a partir del mapa de propiedades
 * @param {Object} propertyMap - Mapa de propiedades planas
 * @returns {Object} Estructura jerárquica
 */
const buildHierarchicalStructure = (propertyMap) => {
  const hierarchy = {};
  const pathArray = Object.keys(propertyMap).sort();

  pathArray.forEach(path => {
    const property = propertyMap[path];
    const parts = path.split('.');
    
    // Crear entrada jerárquica
    const hierarchicalEntry = {
      ...property,
      children: [],
      isExpanded: property.level < 2, // Auto-expandir primeros 2 niveles
      hasChildren: false
    };

    // Determinar si tiene hijos
    const childPaths = pathArray.filter(p => 
      p.startsWith(path + '.') && 
      p.split('.').length === parts.length + 1
    );
    
    hierarchicalEntry.hasChildren = childPaths.length > 0;
    hierarchy[path] = hierarchicalEntry;
  });

  return hierarchy;
};

/**
 * Utilidades para detectar subtipos de string
 */
const isDateString = (str) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  return dateRegex.test(str);
};

const isEmailString = (str) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
};

const isUrlString = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * Genera estadísticas globales de la comparación
 * @param {Object} comparisonResult - Resultado de la comparación
 * @returns {Object} Estadísticas globales
 */
export const generateComparisonStats = (comparisonResult) => {
  if (!comparisonResult) return null;

  const properties = Object.values(comparisonResult);
  
  return {
    totalProperties: properties.length,
    requiredProperties: properties.filter(p => p.isRequired).length,
    optionalProperties: properties.filter(p => !p.isRequired).length,
    conflictProperties: properties.filter(p => p.type === 'mixed').length,
    maxDepth: Math.max(...properties.map(p => p.level)),
    typeDistribution: getTypeDistribution(properties),
    statusDistribution: getStatusDistribution(properties)
  };
};

/**
 * Calcula distribución de tipos
 */
const getTypeDistribution = (properties) => {
  const distribution = {};
  properties.forEach(prop => {
    distribution[prop.type] = (distribution[prop.type] || 0) + 1;
  });
  return distribution;
};

/**
 * Calcula distribución de status
 */
const getStatusDistribution = (properties) => {
  const distribution = {};
  properties.forEach(prop => {
    distribution[prop.status] = (distribution[prop.status] || 0) + 1;
  });
  return distribution;
};

/**
 * Filtra propiedades por criterios específicos
 * @param {Object} comparisonResult - Resultado de comparación
 * @param {Object} filters - Filtros a aplicar
 * @returns {Object} Propiedades filtradas
 */
export const filterProperties = (comparisonResult, filters = {}) => {
  if (!comparisonResult) return {};

  let filtered = { ...comparisonResult };

  // Filtrar por tipo
  if (filters.type) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([_, prop]) => prop.type === filters.type)
    );
  }

  // Filtrar por status
  if (filters.status) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([_, prop]) => prop.status === filters.status)
    );
  }

  // Filtrar por nivel máximo
  if (filters.maxLevel !== undefined) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([_, prop]) => prop.level <= filters.maxLevel)
    );
  }

  // Filtrar por búsqueda de texto
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([path, prop]) => 
        path.toLowerCase().includes(searchLower) ||
        prop.key.toLowerCase().includes(searchLower)
      )
    );
  }

  return filtered;
};