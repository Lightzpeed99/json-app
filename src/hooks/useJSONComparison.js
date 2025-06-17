// src/hooks/useJSONComparison.js

import { useState, useEffect, useMemo } from "react";
import {
  mergeJSONStructures,
  generateComparisonStats,
  filterProperties,
} from "../utils/jsonComparator";
import {
  initializeExpandedPaths,
  toggleNodeExpansion,
} from "../utils/smartSelection";

/**
 * Custom hook para manejar la comparación de JSONs con nueva lógica de expansión
 * @param {Array} loadedJSONs - Array de JSONs cargados
 * @returns {Object} Estado y funciones de comparación
 */
export const useJSONComparison = (loadedJSONs) => {
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filters, setFilters] = useState({});
  const [expandedPaths, setExpandedPaths] = useState(new Set());

  // Procesar comparación cuando cambian los JSONs
  useEffect(() => {
    const processComparison = async () => {
      if (!loadedJSONs || loadedJSONs.length === 0) {
        setComparisonResult(null);
        setExpandedPaths(new Set()); // LIMPIO: Sin elementos expandidos
        return;
      }

      setIsProcessing(true);

      try {
        // Simular procesamiento async para UX
        await new Promise((resolve) => setTimeout(resolve, 100));

        const result = mergeJSONStructures(loadedJSONs);
        setComparisonResult(result);

        // NUEVA LÓGICA: Inicialización limpia - solo nivel raíz visible
        if (result) {
          const cleanExpandedPaths = initializeExpandedPaths(result);
          setExpandedPaths(cleanExpandedPaths);
        }
      } catch (error) {
        console.error("Error processing comparison:", error);
        setComparisonResult(null);
        setExpandedPaths(new Set());
      } finally {
        setIsProcessing(false);
      }
    };

    processComparison();
  }, [loadedJSONs]);

  // Resultado filtrado basado en filtros activos
  const filteredResult = useMemo(() => {
    if (!comparisonResult) return null;
    return filterProperties(comparisonResult, filters);
  }, [comparisonResult, filters]);

  // Estadísticas de la comparación
  const stats = useMemo(() => {
    return generateComparisonStats(comparisonResult);
  }, [comparisonResult]);

  // Estadísticas del resultado filtrado
  const filteredStats = useMemo(() => {
    return generateComparisonStats(filteredResult);
  }, [filteredResult]);

  // ACTUALIZADA: Función para toggle usando nueva lógica
  const toggleExpanded = (path) => {
    const newExpandedPaths = toggleNodeExpansion(path, expandedPaths);
    setExpandedPaths(newExpandedPaths);
  };

  // SIMPLIFICADAS: Funciones de expansión masiva
  const expandAll = () => {
    if (!comparisonResult) return;
    const allPaths = new Set(Object.keys(comparisonResult));
    setExpandedPaths(allPaths);
  };

  const collapseAll = () => {
    const cleanExpandedPaths = initializeExpandedPaths(comparisonResult);
    setExpandedPaths(cleanExpandedPaths);
  };

  // SIMPLIFICADA: Expandir solo hasta cierto nivel
  const expandToLevel = (maxLevel) => {
    if (!comparisonResult) return;
    const levelPaths = new Set();

    Object.entries(comparisonResult).forEach(([path, property]) => {
      if (property.level <= maxLevel) {
        levelPaths.add(path);
      }
    });

    setExpandedPaths(levelPaths);
  };

  // Funciones de filtrado (sin cambios)
  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const setTypeFilter = (type) => {
    setFilters((prev) => ({ ...prev, type }));
  };

  const setStatusFilter = (status) => {
    setFilters((prev) => ({ ...prev, status }));
  };

  const setSearchFilter = (searchText) => {
    setFilters((prev) => ({ ...prev, searchText }));
  };

  const setMaxLevelFilter = (maxLevel) => {
    setFilters((prev) => ({ ...prev, maxLevel }));
  };

  // Obtener propiedades de un nivel específico
  const getPropertiesByLevel = (level) => {
    if (!comparisonResult) return [];
    return Object.entries(comparisonResult)
      .filter(([_, property]) => property.level === level)
      .map(([path, property]) => ({ path, ...property }));
  };

  // Obtener hijos de una propiedad
  const getChildProperties = (parentPath) => {
    if (!comparisonResult) return [];
    return Object.entries(comparisonResult)
      .filter(([path, _]) => {
        const parts = path.split(".");
        const parentParts = parentPath.split(".");
        return (
          parts.length === parentParts.length + 1 &&
          path.startsWith(parentPath + ".")
        );
      })
      .map(([path, property]) => ({ path, ...property }));
  };

  // Verificar si una propiedad está expandida
  const isExpanded = (path) => {
    return expandedPaths.has(path);
  };

  // Verificar si una propiedad tiene hijos expandidos
  const hasExpandedChildren = (path) => {
    return Array.from(expandedPaths).some((p) => p.startsWith(path + "."));
  };

  // Obtener información de validación de JSONs
  const getValidationInfo = () => {
    if (!loadedJSONs) return { valid: 0, invalid: 0, total: 0 };

    const valid = loadedJSONs.filter((json) => json.valid).length;
    const invalid = loadedJSONs.length - valid;

    return {
      valid,
      invalid,
      total: loadedJSONs.length,
      validPercentage:
        loadedJSONs.length > 0
          ? Math.round((valid / loadedJSONs.length) * 100)
          : 0,
    };
  };

  // Buscar propiedades por texto
  const searchProperties = (searchText) => {
    if (!comparisonResult || !searchText) return [];

    const searchLower = searchText.toLowerCase();
    return Object.entries(comparisonResult)
      .filter(
        ([path, property]) =>
          path.toLowerCase().includes(searchLower) ||
          property.key.toLowerCase().includes(searchLower) ||
          property.type.toLowerCase().includes(searchLower)
      )
      .map(([path, property]) => ({ path, ...property }));
  };

  return {
    // Estado
    comparisonResult,
    filteredResult,
    isProcessing,
    filters,
    expandedPaths,

    // NUEVA: Función directa para actualizar expandedPaths
    setExpandedPaths,

    // Estadísticas
    stats,
    filteredStats,
    validationInfo: getValidationInfo(),

    // Funciones de expansión (actualizadas)
    toggleExpanded,
    expandAll,
    collapseAll,
    expandToLevel,
    isExpanded,
    hasExpandedChildren,

    // Funciones de filtrado
    updateFilters,
    clearFilters,
    setTypeFilter,
    setStatusFilter,
    setSearchFilter,
    setMaxLevelFilter,

    // Utilidades de consulta
    getPropertiesByLevel,
    getChildProperties,
    searchProperties,

    // Estado derivado
    hasComparison: !!comparisonResult,
    hasFilters: Object.keys(filters).length > 0,
    isEmpty: !comparisonResult || Object.keys(comparisonResult).length === 0,
  };
};
