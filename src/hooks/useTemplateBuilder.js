// src/hooks/useTemplateBuilder.js

import { useState, useMemo } from "react";
import {
  generateTemplate,
  generateArrayConfig,
  generateTemplateWithArrays,
  formatTemplate,
  getTemplateStats,
} from "../utils/templateGenerator";

/**
 * Custom hook para manejar la construcción de templates
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

  // Generar template base
  const baseTemplate = useMemo(() => {
    if (!selectedProperties || selectedProperties.size === 0) return {};
    return generateTemplate(selectedProperties, loadedJSONs, comparisonResult);
  }, [selectedProperties, loadedJSONs, comparisonResult]);

  // Generar configuración de arrays automática
  const autoArrayConfig = useMemo(() => {
    return generateArrayConfig(selectedProperties, comparisonResult);
  }, [selectedProperties, comparisonResult]);

  // Template final con configuración de arrays
  const finalTemplate = useMemo(() => {
    const mergedConfig = { ...autoArrayConfig };

    // Aplicar configuración manual del usuario
    Object.entries(arrayConfig).forEach(([path, config]) => {
      if (mergedConfig[path]) {
        mergedConfig[path].count = config.count;
      }
    });

    return generateTemplateWithArrays(
      selectedProperties,
      loadedJSONs,
      mergedConfig
    );
  }, [
    baseTemplate,
    arrayConfig,
    autoArrayConfig,
    selectedProperties,
    loadedJSONs,
  ]);

  // Template formateado para visualización
  const formattedTemplate = useMemo(() => {
    return formatTemplate(finalTemplate);
  }, [finalTemplate]);

  // Estadísticas del template
  const templateStats = useMemo(() => {
    return getTemplateStats(finalTemplate);
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

  // Obtener arrays disponibles
  const getAvailableArrays = () => {
    return Object.keys(autoArrayConfig);
  };

  // Obtener cantidad actual de un array
  const getArrayCount = (arrayPath) => {
    return (
      arrayConfig[arrayPath]?.count || autoArrayConfig[arrayPath]?.count || 1
    );
  };

  // Exportar template como archivo
  const exportAsFile = (filename = null) => {
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
    try {
      await navigator.clipboard.writeText(formattedTemplate);
      return true;
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      return false;
    }
  };

  // Validar template
  const validateTemplate = () => {
    try {
      JSON.parse(formattedTemplate);
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
      };
    }
  };

  // Obtener propiedades faltantes (seleccionadas pero no encontradas)
  const getMissingProperties = () => {
    const missing = [];

    Array.from(selectedProperties).forEach((path) => {
      if (!hasProperty(finalTemplate, path)) {
        missing.push(path);
      }
    });

    return missing;
  };

  // Verificar si una propiedad existe en el template
  const hasProperty = (obj, path) => {
    try {
      if (path.includes("[0]")) {
        const parts = path.split(".");
        let current = obj;

        for (const part of parts) {
          if (part.includes("[0]")) {
            const arrayName = part.replace("[0]", "");
            current = current[arrayName];
            if (!Array.isArray(current) || current.length === 0) return false;
            current = current[0];
          } else {
            current = current[part];
            if (current === undefined) return false;
          }
        }
        return true;
      } else {
        return obj.hasOwnProperty(path);
      }
    } catch {
      return false;
    }
  };

  // Obtener preview del template con datos de ejemplo
  const getPreviewWithExamples = () => {
    if (!finalTemplate || Object.keys(finalTemplate).length === 0) {
      return {
        isEmpty: true,
        message: "Selecciona propiedades para generar un template",
      };
    }

    return {
      isEmpty: false,
      template: finalTemplate,
      formatted: formattedTemplate,
      stats: templateStats,
      validation: validateTemplate(),
      missingProperties: getMissingProperties(),
    };
  };

  return {
    // Templates
    baseTemplate,
    finalTemplate,
    formattedTemplate,

    // Configuración
    arrayConfig,
    autoArrayConfig,
    templateName,

    // Estadísticas
    templateStats,

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

    // Validación
    validateTemplate,
    getMissingProperties,
    getPreviewWithExamples,

    // Estado derivado
    hasTemplate: Object.keys(finalTemplate).length > 0,
    hasArrays: Object.keys(autoArrayConfig).length > 0,
    isValid: validateTemplate().isValid,
  };
};
