// src/utils/smartSelection.js

/**
 * Utilidades CORREGIDAS para manejo de selección y expansión jerárquica
 * Comportamiento tipo Postman: control granular e independiente
 */

/**
 * Obtiene todas las propiedades hijas de un path dado
 * @param {string} parentPath - Path del padre
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Array} Array de paths hijos
 */
export const getChildProperties = (parentPath, comparisonResult) => {
  if (!comparisonResult || !parentPath) return [];

  return Object.keys(comparisonResult).filter((path) => {
    // Para arrays: buscar propiedades que empiecen con parent[0].
    if (parentPath.includes("[0]")) {
      return path.startsWith(parentPath + ".") && path !== parentPath;
    }

    // Para objetos normales y arrays padre
    const isDirectChild =
      path.startsWith(parentPath + ".") || path.startsWith(parentPath + "[0].");
    return isDirectChild && path !== parentPath;
  });
};

/**
 * Obtiene solo el padre directo de una propiedad
 * @param {string} propertyPath - Path de la propiedad
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {string|null} Path del padre directo o null
 */
export const getDirectParent = (propertyPath, comparisonResult) => {
  if (!comparisonResult || !propertyPath) return null;

  // Manejar arrays: requestedShipment.commodities[0].description
  if (propertyPath.includes("[0]")) {
    const parts = propertyPath.split(".");
    if (parts.length <= 1) return null;

    // Buscar el path del padre
    const parentPath = parts.slice(0, -1).join(".");
    return comparisonResult[parentPath] ? parentPath : null;
  }

  // Objetos normales
  const parts = propertyPath.split(".");
  if (parts.length <= 1) return null;

  const parentPath = parts.slice(0, -1).join(".");
  return comparisonResult[parentPath] ? parentPath : null;
};

/**
 * CORREGIDA: Obtiene solo los hijos directos del siguiente nivel
 * @param {string} parentPath - Path del padre
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Array} Array de paths hijos directos únicamente
 */
export const getDirectChildren = (parentPath, comparisonResult) => {
  if (!comparisonResult || !parentPath) return [];

  const parentProperty = comparisonResult[parentPath];
  if (!parentProperty) return [];

  // NUEVO: Comportamiento uniforme para arrays y objetos
  // Solo buscar hijos del SIGUIENTE nivel inmediato

  const directChildren = [];

  // CASO 1: Si el padre es un ARRAY, buscar elementos [0]
  if (parentProperty.type === "array") {
    Object.keys(comparisonResult).forEach((path) => {
      // Buscar: parentPath[0].hijo (solo hijos directos)
      if (path.startsWith(parentPath + "[0].")) {
        const remainingPath = path.substring(parentPath.length + 4);
        // Verificar que sea hijo directo (no nieto)
        if (!remainingPath.includes(".") && !remainingPath.includes("[0]")) {
          directChildren.push(path);
        }
      }
    });
  }
  // CASO 2: Si el padre es un OBJETO normal
  else if (parentProperty.type === "object") {
    Object.keys(comparisonResult).forEach((path) => {
      // Buscar: parentPath.hijo (solo hijos directos)
      if (path.startsWith(parentPath + ".")) {
        const remainingPath = path.substring(parentPath.length + 1);
        // Verificar que sea hijo directo (no nieto)
        if (!remainingPath.includes(".") && !remainingPath.includes("[0]")) {
          directChildren.push(path);
        }
      }
    });
  }

  return directChildren;
};

/**
 * Determina si una propiedad es un array padre
 * @param {string} path - Path de la propiedad
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si es un array padre
 */
export const isArrayParent = (path, comparisonResult) => {
  if (!comparisonResult || !path) return false;

  const property = comparisonResult[path];
  if (!property) return false;

  // Es array padre si es tipo array y tiene hijos
  return property.type === "array" && hasChildren(path, comparisonResult);
};

/**
 * CORREGIDA: Verifica si una propiedad tiene hijos
 * @param {string} path - Path de la propiedad
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si tiene hijos
 */
export const hasChildren = (path, comparisonResult) => {
  if (!comparisonResult || !path) return false;

  // Verificar si tiene hijos directos (objetos) o elementos de array
  return Object.keys(comparisonResult).some(
    (p) => p.startsWith(path + ".") || p.startsWith(path + "[0].")
  );
};

/**
 * CORREGIDA: Selección simple sin cascada automática (modo Postman)
 * @param {string} selectedPath - Path seleccionado
 * @param {Set} currentSelection - Selección actual
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} { toSelect: Set, toDeselect: Set }
 */
export const calculateSmartSelection = (
  selectedPath,
  currentSelection,
  comparisonResult
) => {
  const toSelect = new Set();
  const toDeselect = new Set();

  if (!comparisonResult || !selectedPath) {
    return { toSelect, toDeselect };
  }

  const isCurrentlySelected = currentSelection.has(selectedPath);

  if (isCurrentlySelected) {
    // DESELECCIONAR: Solo la propiedad específica
    toDeselect.add(selectedPath);

    // OPCIONAL: Deseleccionar hijos si están seleccionados
    // (comportamiento configurable para mantener flexibilidad)
    const children = getChildProperties(selectedPath, comparisonResult);
    children.forEach((child) => {
      if (currentSelection.has(child)) {
        toDeselect.add(child);
      }
    });
  } else {
    // SELECCIONAR: Solo la propiedad específica + padre directo si es necesario
    toSelect.add(selectedPath);

    // MÍNIMO: Solo agregar el padre directo para estructura válida
    const directParent = getDirectParent(selectedPath, comparisonResult);
    if (directParent && !currentSelection.has(directParent)) {
      toSelect.add(directParent);
    }

    // REMOVIDO: Ya no seleccionamos automáticamente hijos de arrays
    // El usuario debe seleccionar manualmente cada propiedad que necesite
  }

  return { toSelect, toDeselect };
};

/**
 * Aplica la selección corregida
 * @param {string} toggledPath - Path que se está toggling
 * @param {Set} currentSelection - Selección actual
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Set} Nueva selección
 */
export const applySmartSelection = (
  toggledPath,
  currentSelection,
  comparisonResult
) => {
  const newSelection = new Set(currentSelection);
  const { toSelect, toDeselect } = calculateSmartSelection(
    toggledPath,
    currentSelection,
    comparisonResult
  );

  // Aplicar deselecciones
  toDeselect.forEach((path) => newSelection.delete(path));

  // Aplicar selecciones
  toSelect.forEach((path) => newSelection.add(path));

  return newSelection;
};

/**
 * CORREGIDA: Construye lista de nodos visibles con control granular
 * @param {Object} comparisonResult - Resultado de comparación
 * @param {Set} expandedPaths - Paths expandidos
 * @returns {Array} Array de nodos para renderizar EN ORDEN JERÁRQUICO
 */
export const buildTreeStructure = (
  comparisonResult,
  expandedPaths = new Set()
) => {
  if (!comparisonResult) return [];

  const visibleNodes = [];
  const allPaths = Object.keys(comparisonResult).sort();

  // REGLA SIMPLE: Recorrer todos los paths y decidir si son visibles
  allPaths.forEach((path) => {
    if (shouldShowNode(path, expandedPaths, comparisonResult)) {
      const property = comparisonResult[path];
      visibleNodes.push({
        ...property,
        path,
        hasChildren: hasChildren(path, comparisonResult),
        isExpanded: expandedPaths.has(path),
        isArrayParent: isArrayParent(path, comparisonResult),
        level: calculateNodeLevel(path),
      });
    }
  });

  return visibleNodes;
};

/**
 * CORREGIDA: Determina si un nodo debe mostrarse - Control granular estricto
 * @param {string} path - Path del nodo
 * @param {Set} expandedPaths - Paths expandidos
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si debe mostrarse
 */
const shouldShowNode = (path, expandedPaths, comparisonResult) => {
  const parts = path.split(".");

  // NIVEL 0: Siempre visible (raíz)
  if (parts.length === 1 && !path.includes("[0]")) {
    return true;
  }

  // ELEMENTOS DE ARRAY: ej. "commodities[0].description"
  if (path.includes("[0]")) {
    const pathBeforeArray = path.split("[0]")[0]; // "commodities"

    // REGLA ESTRICTA: El array padre debe estar expandido explícitamente
    if (!expandedPaths.has(pathBeforeArray)) {
      return false;
    }

    // Para elementos anidados dentro del array
    const pathAfterArray = path.split("[0]")[1]; // ".description"
    if (pathAfterArray && pathAfterArray !== ".") {
      // Verificar que todos los padres intermedios estén expandidos
      const fullArrayPath = pathBeforeArray + "[0]";
      const remainingParts = pathAfterArray.substring(1).split(".");

      for (let i = 1; i < remainingParts.length; i++) {
        const intermediatePath =
          fullArrayPath + "." + remainingParts.slice(0, i).join(".");
        if (
          comparisonResult[intermediatePath] &&
          !expandedPaths.has(intermediatePath)
        ) {
          return false;
        }
      }
    }

    // También verificar ancestros del array
    const ancestorParts = pathBeforeArray.split(".");
    for (let i = 1; i < ancestorParts.length; i++) {
      const ancestorPath = ancestorParts.slice(0, i).join(".");
      if (comparisonResult[ancestorPath] && !expandedPaths.has(ancestorPath)) {
        return false;
      }
    }

    return true;
  }

  // OBJETOS NORMALES: Solo visible si el padre DIRECTO está expandido
  const parentPath = parts.slice(0, -1).join(".");

  // Verificar que el padre existe y está expandido
  if (comparisonResult[parentPath]) {
    return expandedPaths.has(parentPath);
  }

  return false;
};

/**
 * CORREGIDA: Toggle de expansión granular - solo afecta al nodo específico
 * @param {string} path - Path del nodo a togglear
 * @param {Set} expandedPaths - Paths actualmente expandidos
 * @returns {Set} Nuevo conjunto de paths expandidos
 */
export const toggleNodeExpansion = (path, expandedPaths) => {
  const newExpandedPaths = new Set(expandedPaths);

  if (expandedPaths.has(path)) {
    // COLAPSAR: Remover este nodo y todos sus descendientes
    newExpandedPaths.delete(path);

    // Remover todos los descendientes para evitar inconsistencias
    Array.from(expandedPaths).forEach((expandedPath) => {
      if (
        expandedPath.startsWith(path + ".") ||
        expandedPath.startsWith(path + "[0].")
      ) {
        newExpandedPaths.delete(expandedPath);
      }
    });
  } else {
    // EXPANDIR: Solo agregar este nodo específico
    newExpandedPaths.add(path);

    // NO expandir automáticamente descendientes
    // El usuario debe expandir manualmente cada nivel que necesite
  }

  return newExpandedPaths;
};

/**
 * NUEVA: Función específica para inicialización limpia
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Set} Set vacío para inicio limpio
 */
export const initializeExpandedPaths = (comparisonResult) => {
  // INICIO LIMPIO: Sin nada expandido = solo nivel raíz visible
  return new Set();
};

/**
 * NUEVA: Calcula el nivel visual de un nodo considerando arrays
 * @param {string} path - Path de la propiedad
 * @returns {number} Nivel visual del nodo
 */
const calculateNodeLevel = (path) => {
  if (!path) return 0;

  // Contar niveles considerando arrays como parte de la jerarquía
  let level = 0;
  const parts = path.split(".");

  parts.forEach((part) => {
    if (part.includes("[0]")) {
      level += 1; // El array cuenta como un nivel
      if (part !== part.replace("[0]", "")) {
        // Si hay contenido después del [0], cuenta como otro nivel
        const afterArray = part.split("[0]")[1];
        if (afterArray && afterArray !== "") {
          level += 1;
        }
      }
    } else {
      level += 1;
    }
  });

  return Math.max(0, level - 1); // Ajustar porque empezamos en 0
};

/**
 * Obtiene el nivel de un path (versión simple)
 * @param {string} path - Path de la propiedad
 * @returns {number} Nivel del path (0 = raíz)
 */
export const getPathLevel = (path) => {
  return calculateNodeLevel(path);
};

/**
 * Verifica si un path es hijo directo de otro
 * @param {string} childPath - Path del hijo
 * @param {string} parentPath - Path del padre
 * @returns {boolean} True si es hijo directo
 */
export const isDirectChild = (childPath, parentPath) => {
  if (!childPath || !parentPath) return false;

  // Verificar que empiece con el padre
  if (
    !childPath.startsWith(parentPath + ".") &&
    !childPath.startsWith(parentPath + "[0].")
  ) {
    return false;
  }

  // Verificar que sea hijo directo (no nieto)
  const remainingPath = childPath.startsWith(parentPath + "[0].")
    ? childPath.substring(parentPath.length + 4)
    : childPath.substring(parentPath.length + 1);

  return !remainingPath.includes(".");
};

/**
 * NUEVA: Valida que un path es seleccionable (tiene padre válido)
 * @param {string} path - Path a validar
 * @param {Set} selectedProperties - Propiedades actualmente seleccionadas
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si el path es válido para seleccionar
 */
export const isValidSelection = (
  path,
  selectedProperties,
  comparisonResult
) => {
  if (!path || !comparisonResult) return false;

  // Nivel raíz siempre es válido
  if (!path.includes(".") && !path.includes("[0]")) return true;

  // Verificar que el padre directo esté seleccionado o sea válido
  const parent = getDirectParent(path, comparisonResult);
  if (!parent) return true; // Sin padre = válido

  // El padre debe estar seleccionado para que el hijo sea válido
  return (
    selectedProperties.has(parent) ||
    isValidSelection(parent, selectedProperties, comparisonResult)
  );
};
