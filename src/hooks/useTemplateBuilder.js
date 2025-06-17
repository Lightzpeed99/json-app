// src/hooks/useTemplateBuilder.js

import { useState, useMemo } from "react";
import {
  generateTemplate,
  generateArrayConfig,
  generateTemplateWithArrays,
  formatTemplate,
  getTemplateStats,
  validateTemplate,
  getSelectionInfo,
} from "../utils/templateGenerator";

/**
 * CORREGIDO: Custom hook para manejar la construcción de templates
 * Ahora usa EXACTAMENTE las propiedades seleccionadas sin agregar contenido extra
 * @param {Set} selectedProperties - Propiedades seleccionadas
 * @param {Array} loadedJSONs - JSONs cargados
 * @param {Object} comparisonResult - Resultado de comparación
 * @returns {Object} Estado y funciones del template builder
 */
export const useTemplateBuilder = (
  selectedProperties,
  loadedJSONs,
  comparisonResult
) => {
  const [arrayConfig, setArrayConfig] = useState({});
  const [templateName, setTemplateName] = useState("");

  // CORREGIDO: Template base usando SOLO propiedades seleccionadas
  const baseTemplate = useMemo(() => {
    if (!selectedProperties || selectedProperties.size === 0) {
      return {};
    }

    // IMPORTANTE: Pasar comparisonResult para validación
    return generateTemplate(selectedProperties, loadedJSONs, comparisonResult);
  }, [selectedProperties, loadedJSONs, comparisonResult]);

  // CORREGIDO: Configuración de arrays basada SOLO en selecciones
  const autoArrayConfig = useMemo(() => {
    if (!selectedProperties || selectedProperties.size === 0) {
      return {};
    }

    return generateArrayConfig(selectedProperties, comparisonResult);
  }, [selectedProperties, comparisonResult]);

  // CORREGIDO: Template final con arrays expandidos según selecciones exactas
  const finalTemplate = useMemo(() => {
    if (!selectedProperties || selectedProperties.size === 0) {
      return {};
    }

    // Combinar configuración automática con manual del usuario
    const mergedConfig = { ...autoArrayConfig };

    // Aplicar configuración manual del usuario (solo cambios en count)
    Object.entries(arrayConfig).forEach(([path, config]) => {
      if (mergedConfig[path]) {
        mergedConfig[path] = {
          ...mergedConfig[path],
          count: config.count,
        };
      }
    });

    // CLAVE: Usar generateTemplateWithArrays que respeta selecciones exactas
    return generateTemplateWithArrays(
      selectedProperties,
      loadedJSONs,
      mergedConfig
    );
  }, [selectedProperties, loadedJSONs, autoArrayConfig, arrayConfig]);

  // Template formateado para visualización
  const formattedTemplate = useMemo(() => {
    return formatTemplate(finalTemplate);
  }, [finalTemplate]);

  // CORREGIDO: Estadísticas usando la función mejorada
  const templateStats = useMemo(() => {
    return getTemplateStats(finalTemplate);
  }, [finalTemplate]);

  // NUEVA: Información de selección detallada
  const selectionInfo = useMemo(() => {
    return getSelectionInfo(selectedProperties, comparisonResult);
  }, [selectedProperties, comparisonResult]);

  // NUEVA: Validación del template
  const templateValidation = useMemo(() => {
    return validateTemplate(finalTemplate);
  }, [finalTemplate]);

  // Configurar cantidad de elementos para un array
  const setArrayCount = (arrayPath, count) => {
    setArrayConfig((prev) => ({
      ...prev,
      [arrayPath]: { count: Math.max(1, count) },
    }));
  };

  // Resetear configuración de arrays
  const resetArrayConfig = () => {
    setArrayConfig({});
  };

  // CORREGIDO: Obtener arrays disponibles solo de selecciones actuales
  const getAvailableArrays = () => {
    return Object.keys(autoArrayConfig);
  };

  // Obtener cantidad actual de un array
  const getArrayCount = (arrayPath) => {
    return (
      arrayConfig[arrayPath]?.count || autoArrayConfig[arrayPath]?.count || 1
    );
  };

  // CORREGIDO: Exportar template como archivo
  const exportAsFile = (filename = null) => {
    if (!hasTemplate) {
      console.warn("No template to export");
      return;
    }

    const name = filename || templateName || "template.json";
    const blob = new Blob([formattedTemplate], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = name.endsWith(".json") ? name : `${name}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // Copiar al portapapeles
  const copyToClipboard = async () => {
    if (!hasTemplate) {
      console.warn("No template to copy");
      return false;
    }

    try {
      await navigator.clipboard.writeText(formattedTemplate);
      return true;
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      return false;
    }
  };

  // NUEVA: Función de validación mejorada
  const validateTemplateStructure = () => {
    return templateValidation;
  };

  // NUEVA: Obtener propiedades faltantes en el template
  const getMissingProperties = () => {
    const missing = [];
    const templatePaths = new Set();

    // Extraer todos los paths del template generado
    const extractPaths = (obj, currentPath = "") => {
      Object.keys(obj).forEach((key) => {
        const path = currentPath ? `${currentPath}.${key}` : key;
        templatePaths.add(path);

        if (
          Array.isArray(obj[key]) &&
          obj[key].length > 0 &&
          typeof obj[key][0] === "object"
        ) {
          // Para arrays, agregar paths con [0]
          extractPaths(obj[key][0], `${path}[0]`);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          extractPaths(obj[key], path);
        }
      });
    };

    if (finalTemplate && typeof finalTemplate === "object") {
      extractPaths(finalTemplate);
    }

    // Comparar con propiedades seleccionadas
    Array.from(selectedProperties).forEach((selectedPath) => {
      if (!templatePaths.has(selectedPath)) {
        missing.push(selectedPath);
      }
    });

    return missing;
  };

  // NUEVA: Función para obtener preview con ejemplos y validación
  const getPreviewWithExamples = () => {
    if (!finalTemplate || Object.keys(finalTemplate).length === 0) {
      return {
        isEmpty: true,
        message: "Selecciona propiedades para generar un template",
        selectionCount: selectedProperties.size,
      };
    }

    const missingProperties = getMissingProperties();

    return {
      isEmpty: false,
      template: finalTemplate,
      formatted: formattedTemplate,
      stats: templateStats,
      validation: templateValidation,
      missingProperties,
      selectionInfo,
      exactMatch: missingProperties.length === 0,
      coverage:
        selectedProperties.size > 0
          ? (
              ((selectedProperties.size - missingProperties.length) /
                selectedProperties.size) *
              100
            ).toFixed(1)
          : 0,
    };
  };

  // NUEVA: Función para limpiar template (remover propiedades no seleccionadas)
  const cleanTemplate = () => {
    // Forzar regeneración del template solo con propiedades seleccionadas
    return generateTemplate(selectedProperties, loadedJSONs, comparisonResult);
  };

  // NUEVA: Verificar si una propiedad específica está en el template
  const hasPropertyInTemplate = (propertyPath) => {
    try {
      const parts = propertyPath.split(".");
      let current = finalTemplate;

      for (const part of parts) {
        if (part.includes("[0]")) {
          const arrayName = part.replace("[0]", "");
          current = current[arrayName];
          if (Array.isArray(current) && current.length > 0) {
            current = current[0];
          } else {
            return false;
          }
        } else {
          current = current[part];
          if (current === undefined) return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  // NUEVA: Obtener diferencias entre selección y template
  const getTemplateDifferences = () => {
    const inSelection = Array.from(selectedProperties);
    const inTemplate = [];
    const missing = [];
    const extra = [];

    // Extraer paths del template
    const extractTemplatePaths = (obj, currentPath = "") => {
      Object.keys(obj).forEach((key) => {
        const path = currentPath ? `${currentPath}.${key}` : key;
        inTemplate.push(path);

        if (
          Array.isArray(obj[key]) &&
          obj[key].length > 0 &&
          typeof obj[key][0] === "object"
        ) {
          extractTemplatePaths(obj[key][0], `${path}[0]`);
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          extractTemplatePaths(obj[key], path);
        }
      });
    };

    if (finalTemplate && typeof finalTemplate === "object") {
      extractTemplatePaths(finalTemplate);
    }

    // Encontrar diferencias
    inSelection.forEach((path) => {
      if (!inTemplate.includes(path)) {
        missing.push(path);
      }
    });

    inTemplate.forEach((path) => {
      if (!inSelection.includes(path)) {
        extra.push(path);
      }
    });

    return {
      inSelection,
      inTemplate,
      missing,
      extra,
      isExactMatch: missing.length === 0 && extra.length === 0,
    };
  };

  // Estados derivados CORREGIDOS
  const hasTemplate = Object.keys(finalTemplate).length > 0;
  const hasArrays = Object.keys(autoArrayConfig).length > 0;
  const isValid = templateValidation.isValid;
  const hasSelection = selectedProperties.size > 0;

  return {
    // Templates
    baseTemplate,
    finalTemplate,
    formattedTemplate,

    // Configuración
    arrayConfig,
    autoArrayConfig,
    templateName,

    // Estadísticas y validación
    templateStats,
    selectionInfo,
    templateValidation,

    // Funciones de configuración
    setArrayCount,
    resetArrayConfig,
    setTemplateName,

    // Utilidades
    getAvailableArrays,
    getArrayCount,

    // Acciones
    exportAsFile,
    copyToClipboard,

    // Validación y análisis NUEVAS
    validateTemplateStructure,
    getMissingProperties,
    getPreviewWithExamples,
    cleanTemplate,
    hasPropertyInTemplate,
    getTemplateDifferences,

    // Estado derivado CORREGIDO
    hasTemplate,
    hasArrays,
    isValid,
    hasSelection,
    exactMatch: getTemplateDifferences().isExactMatch,
  };
};
