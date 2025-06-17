// src/utils/smartSelection.js

/**
 * Utilidades SIMPLIFICADAS para manejo de selección y expansión jerárquica
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

  const parts = propertyPath.split(".");

  // Si es de nivel raíz, no tiene padre
  if (parts.length <= 1) return null;

  // Construir path del padre directo
  const parentPath = parts.slice(0, -1).join(".");

  // Verificar que el padre existe en comparisonResult
  return comparisonResult[parentPath] ? parentPath : null;
};

/**
 * CORREGIDA: Obtiene solo los hijos directos manejando arrays correctamente
 * @param {string} parentPath - Path del padre
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Array} Array de paths hijos directos únicamente
 */
export const getDirectChildren = (parentPath, comparisonResult) => {
  if (!comparisonResult || !parentPath) return [];

  const parentProperty = comparisonResult[parentPath];
  if (!parentProperty) return [];

  // CASO 1: Si el padre es un ARRAY, buscar elementos [0]
  if (parentProperty.type === "array") {
    return Object.keys(comparisonResult).filter((path) => {
      // Buscar paths que empiecen con parentPath[0].
      return (
        path.startsWith(parentPath + "[0].") &&
        !path.substring(parentPath.length + 4).includes(".")
      ); // Solo hijos directos del [0]
    });
  }

  // CASO 2: Si el padre es un OBJETO normal
  if (parentProperty.type === "object") {
    return Object.keys(comparisonResult).filter((path) => {
      // Buscar paths que empiecen con parentPath.
      if (path.startsWith(parentPath + ".")) {
        const remainingPath = path.substring(parentPath.length + 1);
        // Verificar que sea hijo directo (no nieto)
        return !remainingPath.includes(".") && !remainingPath.includes("[0]");
      }
      return false;
    });
  }

  // CASO 3: Para otros tipos, buscar hijos directos normales
  return Object.keys(comparisonResult).filter((path) => {
    if (path.startsWith(parentPath + ".")) {
      const remainingPath = path.substring(parentPath.length + 1);
      return !remainingPath.includes(".");
    }
    return false;
  });
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
 * CORREGIDA: Verifica si una propiedad tiene hijos (incluyendo arrays)
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
 * SIMPLIFICADA: Calcula selección inteligente con lógica directa
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
    // DESELECCIONAR: Remover la propiedad y todos sus hijos
    toDeselect.add(selectedPath);

    const allChildren = getChildProperties(selectedPath, comparisonResult);
    allChildren.forEach((child) => {
      if (currentSelection.has(child)) {
        toDeselect.add(child);
      }
    });
  } else {
    // SELECCIONAR: Agregar la propiedad y su padre directo
    toSelect.add(selectedPath);

    // Solo agregar el padre directo, no todos los ancestros
    const directParent = getDirectParent(selectedPath, comparisonResult);
    if (directParent && !currentSelection.has(directParent)) {
      toSelect.add(directParent);
    }

    // Si es un array padre, seleccionar solo hijos directos
    if (isArrayParent(selectedPath, comparisonResult)) {
      const directChildren = getDirectChildren(selectedPath, comparisonResult);
      directChildren.forEach((child) => {
        toSelect.add(child);
      });
    }
  }

  return { toSelect, toDeselect };
};

/**
 * Aplica la selección inteligente a un Set de propiedades seleccionadas
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
 * ULTRA SIMPLE: Construye lista de nodos visibles respetando jerarquía
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
        level: path.split(".").length - 1,
      });
    }
  });

  return visibleNodes;
};

/**
 * CORREGIDA: Determina si un nodo debe mostrarse considerando arrays
 * @param {string} path - Path del nodo
 * @param {Set} expandedPaths - Paths expandidos
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si debe mostrarse
 */
const shouldShowNode = (path, expandedPaths, comparisonResult) => {
  const parts = path.split(".");

  // NIVEL 0: Siempre visible (raíz)
  if (parts.length === 1) return true;

  // DETECTAR SI ES ELEMENTO DE ARRAY
  if (path.includes("[0]")) {
    // Para elementos de array como "commodities[0].algo"
    const pathBeforeArray = path.split("[0]")[0]; // "commodities"

    // El array padre debe estar expandido
    if (!expandedPaths.has(pathBeforeArray)) {
      return false;
    }

    // También verificar que todos los ancestros del array estén expandidos
    const ancestorParts = pathBeforeArray.split(".");
    for (let i = 1; i < ancestorParts.length; i++) {
      const ancestorPath = ancestorParts.slice(0, i).join(".");
      if (comparisonResult[ancestorPath] && !expandedPaths.has(ancestorPath)) {
        return false;
      }
    }

    return true;
  }

  // PARA NODOS NORMALES: Solo visible si el padre DIRECTO está expandido
  const parentPath = parts.slice(0, -1).join(".");
  return expandedPaths.has(parentPath);
};

/**
 * SIMPLE: Toggle de expansión - solo afecta al nodo específico
 * @param {string} path - Path del nodo a togglear
 * @param {Set} expandedPaths - Paths actualmente expandidos
 * @returns {Set} Nuevo conjunto de paths expandidos
 */
export const toggleNodeExpansion = (path, expandedPaths) => {
  const newExpandedPaths = new Set(expandedPaths);

  if (expandedPaths.has(path)) {
    // COLAPSAR: Solo remover este nodo
    newExpandedPaths.delete(path);

    // TAMBIÉN remover todos los descendientes para evitar inconsistencias
    Array.from(expandedPaths).forEach((expandedPath) => {
      if (
        expandedPath.startsWith(path + ".") ||
        expandedPath.startsWith(path + "[0].")
      ) {
        newExpandedPaths.delete(expandedPath);
      }
    });
  } else {
    // EXPANDIR: Solo agregar este nodo
    newExpandedPaths.add(path);
  }

  return newExpandedPaths;
};

/**
 * NUEVA: Función específica para inicialización - solo nivel raíz visible
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Set} Set vacío para que solo se vea nivel raíz
 */
export const initializeExpandedPaths = (comparisonResult) => {
  // INICIO LIMPIO: Sin nada expandido = solo nivel raíz visible
  return new Set();
};

/**
 * Obtiene el nivel de un path
 * @param {string} path - Path de la propiedad
 * @returns {number} Nivel del path (0 = raíz)
 */
export const getPathLevel = (path) => {
  if (!path) return 0;
  return path.split(".").length - 1;
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
