// src/utils/smartSelection.js

/**
 * Utilidades para manejo inteligente de selección padre-hijo
 */

/**
 * Obtiene todas las propiedades hijas de un path dado
 * @param {string} parentPath - Path del padre
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Array} Array de paths hijos
 */
export const getChildProperties = (parentPath, comparisonResult) => {
  if (!comparisonResult || !parentPath) return [];
  
  return Object.keys(comparisonResult).filter(path => {
    // Para arrays: buscar propiedades que empiecen con parent[0].
    if (parentPath.includes('[0]')) {
      return path.startsWith(parentPath + '.') && path !== parentPath;
    }
    
    // Para objetos normales y arrays padre
    const isDirectChild = path.startsWith(parentPath + '.') || 
                         path.startsWith(parentPath + '[0].');
    return isDirectChild && path !== parentPath;
  });
};

/**
 * Obtiene todos los ancestros de una propiedad
 * @param {string} propertyPath - Path de la propiedad
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Array} Array de paths ancestros
 */
export const getAncestorProperties = (propertyPath, comparisonResult) => {
  if (!comparisonResult || !propertyPath) return [];
  
  const ancestors = [];
  const parts = propertyPath.split('.');
  
  // Construir todos los paths ancestros
  for (let i = 1; i <= parts.length; i++) {
    const ancestorPath = parts.slice(0, i).join('.');
    
    // Si el ancestro existe en comparisonResult, agregarlo
    if (comparisonResult[ancestorPath]) {
      ancestors.push(ancestorPath);
    }
    
    // También verificar si hay una versión de array
    const arrayAncestorPath = ancestorPath.replace(/\[0\].*/, '');
    if (arrayAncestorPath !== ancestorPath && comparisonResult[arrayAncestorPath]) {
      ancestors.push(arrayAncestorPath);
    }
  }
  
  // Remover la propiedad misma si está incluida
  return ancestors.filter(path => path !== propertyPath);
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
  return property.type === 'array' && hasChildren(path, comparisonResult);
};

/**
 * Verifica si una propiedad tiene hijos
 * @param {string} path - Path de la propiedad
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si tiene hijos
 */
export const hasChildren = (path, comparisonResult) => {
  if (!comparisonResult || !path) return false;
  
  return Object.keys(comparisonResult).some(p => 
    p.startsWith(path + '.') || p.startsWith(path + '[0].')
  );
};

/**
 * Calcula las propiedades que deberían seleccionarse cuando se selecciona una propiedad
 * @param {string} selectedPath - Path seleccionado
 * @param {Set} currentSelection - Selección actual
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} { toSelect: Set, toDeselect: Set }
 */
export const calculateSmartSelection = (selectedPath, currentSelection, comparisonResult) => {
  const toSelect = new Set();
  const toDeselect = new Set();
  
  if (!comparisonResult || !selectedPath) {
    return { toSelect, toDeselect };
  }
  
  const isCurrentlySelected = currentSelection.has(selectedPath);
  
  if (isCurrentlySelected) {
    // DESELECCIONAR: Remover la propiedad y todos sus hijos
    toDeselect.add(selectedPath);
    
    const children = getChildProperties(selectedPath, comparisonResult);
    children.forEach(child => {
      if (currentSelection.has(child)) {
        toDeselect.add(child);
      }
    });
    
  } else {
    // SELECCIONAR: Agregar la propiedad
    toSelect.add(selectedPath);
    
    // Si es un array padre, seleccionar todos los hijos
    if (isArrayParent(selectedPath, comparisonResult)) {
      const children = getChildProperties(selectedPath, comparisonResult);
      children.forEach(child => {
        toSelect.add(child);
      });
    }
    
    // Si es una propiedad hija, seleccionar también los ancestros
    const ancestors = getAncestorProperties(selectedPath, comparisonResult);
    ancestors.forEach(ancestor => {
      toSelect.add(ancestor);
    });
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
export const applySmartSelection = (toggledPath, currentSelection, comparisonResult) => {
  const newSelection = new Set(currentSelection);
  const { toSelect, toDeselect } = calculateSmartSelection(toggledPath, currentSelection, comparisonResult);
  
  // Aplicar deselecciones
  toDeselect.forEach(path => newSelection.delete(path));
  
  // Aplicar selecciones
  toSelect.forEach(path => newSelection.add(path));
  
  return newSelection;
};

/**
 * Verifica si una selección es consistente (padres e hijos alineados)
 * @param {Set} selection - Selección a verificar
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} { isConsistent: boolean, issues: Array }
 */
export const validateSelection = (selection, comparisonResult) => {
  const issues = [];
  let isConsistent = true;
  
  if (!comparisonResult) {
    return { isConsistent, issues };
  }
  
  Array.from(selection).forEach(path => {
    // Verificar si es array padre y tiene todos los hijos seleccionados
    if (isArrayParent(path, comparisonResult)) {
      const children = getChildProperties(path, comparisonResult);
      const missingChildren = children.filter(child => !selection.has(child));
      
      if (missingChildren.length > 0) {
        isConsistent = false;
        issues.push({
          type: 'missing_children',
          parent: path,
          missingChildren
        });
      }
    }
    
    // Verificar si es hija y tiene ancestros seleccionados
    const ancestors = getAncestorProperties(path, comparisonResult);
    const missingAncestors = ancestors.filter(ancestor => !selection.has(ancestor));
    
    if (missingAncestors.length > 0) {
      isConsistent = false;
      issues.push({
        type: 'missing_ancestors',
        child: path,
        missingAncestors
      });
    }
  });
  
  return { isConsistent, issues };
};

/**
 * Construye estructura jerárquica para renderizado de árbol
 * @param {Object} comparisonResult - Resultado de comparación
 * @param {Set} expandedPaths - Paths expandidos
 * @returns {Array} Array de nodos para renderizar
 */
export const buildTreeStructure = (comparisonResult, expandedPaths = new Set()) => {
  if (!comparisonResult) return [];
  
  const allPaths = Object.keys(comparisonResult).sort();
  const rendered = new Set();
  const treeNodes = [];
  
  allPaths.forEach(path => {
    if (rendered.has(path)) return;
    
    const property = comparisonResult[path];
    const level = property.level || 0;
    
    // Verificar si este nodo debería estar visible
    const shouldRender = shouldNodeBeVisible(path, expandedPaths, comparisonResult);
    
    if (shouldRender) {
      treeNodes.push({
        ...property,
        path,
        hasChildren: hasChildren(path, comparisonResult),
        isExpanded: expandedPaths.has(path),
        isArrayParent: isArrayParent(path, comparisonResult)
      });
      rendered.add(path);
    }
  });
  
  return treeNodes;
};

/**
 * Determina si un nodo debería ser visible en el árbol
 * @param {string} path - Path del nodo
 * @param {Set} expandedPaths - Paths expandidos
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {boolean} True si debería ser visible
 */
const shouldNodeBeVisible = (path, expandedPaths, comparisonResult) => {
  const parts = path.split('.');
  
  // Nodos de nivel 0 siempre visibles
  if (parts.length === 1) return true;
  
  // Para nodos anidados, verificar que todos los ancestros estén expandidos
  for (let i = 1; i < parts.length; i++) {
    const ancestorPath = parts.slice(0, i).join('.');
    
    // Si algún ancestro no está expandido, este nodo no debería ser visible
    if (comparisonResult[ancestorPath] && !expandedPaths.has(ancestorPath)) {
      return false;
    }
  }
  
  return true;
};