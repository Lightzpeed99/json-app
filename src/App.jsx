import React, { useState } from 'react';
import './App.css';
import FileUploader from './components/FileUploader';
import './components/FileUploader.css';
import PropertyTree from './components/PropertyTree';
import { useJSONComparison } from './hooks/useJSONComparison';
import { useTemplateBuilder } from './hooks/useTemplateBuilder';

const App = () => {
  // Estado global de la aplicación
  const [loadedJSONs, setLoadedJSONs] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState(new Set());
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Hook de comparación JSON
  const {
    comparisonResult,
    isProcessing,
    stats,
    hasComparison,
    validationInfo
  } = useJSONComparison(loadedJSONs);

  // Hook de template builder
  const {
    finalTemplate,
    formattedTemplate,
    templateStats,
    arrayConfig,
    templateName,
    setArrayCount,
    setTemplateName,
    getAvailableArrays,
    getArrayCount,
    exportAsFile,
    copyToClipboard,
    validateTemplate,
    getPreviewWithExamples,
    hasTemplate,
    hasArrays,
    isValid
  } = useTemplateBuilder(selectedProperties, loadedJSONs, comparisonResult);

  // Handlers para gestión de JSONs
  const handleFilesLoaded = (files) => {
    setLoadedJSONs(prev => [...prev, ...files]);
  };

  const handleRemoveJSON = (id) => {
    setLoadedJSONs(prev => prev.filter(json => json.id !== id));
  };

  const handlePropertyToggle = (propertyPath) => {
    setSelectedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyPath)) {
        newSet.delete(propertyPath);
      } else {
        newSet.add(propertyPath);
      }
      return newSet;
    });
  };

  // Handlers para template builder
  const handleExportTemplate = async () => {
    const filename = templateName || `template_${new Date().toISOString().slice(0, 10)}`;
    exportAsFile(filename);
  };

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard();
    if (success) {
      // TODO: Mostrar toast de éxito
      console.log('Template copiado al portapapeles');
    } else {
      // TODO: Mostrar toast de error
      console.log('Error al copiar template');
    }
  };

  const handleClearSelection = () => {
    setSelectedProperties(new Set());
  };

  // Determinar clases del grid dinámicamente
  const getGridClasses = () => {
    let classes = 'app-main';
    if (leftPanelCollapsed && rightPanelCollapsed) {
      classes += ' both-collapsed';
    } else if (leftPanelCollapsed) {
      classes += ' left-collapsed';
    } else if (rightPanelCollapsed) {
      classes += ' right-collapsed';
    }
    return classes;
  };

  // Obtener preview del template
  const templatePreview = getPreviewWithExamples();

  return (
    <div className="app">
      <header className="app-header">
        <h1>JSON Documentador</h1>
        <p>Compara y documenta estructuras JSON automáticamente</p>
      </header>

      <main className={getGridClasses()}>
        {/* Panel Izquierdo - Gestión de JSONs */}
        <aside className={`left-panel ${leftPanelCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-header">
            <h2>{leftPanelCollapsed ? 'JSON' : 'JSONs Cargados'}</h2>
            <button 
              className="collapse-btn"
              onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              title={leftPanelCollapsed ? 'Expandir panel' : 'Contraer panel'}
            >
              {leftPanelCollapsed ? '→' : '←'}
            </button>
          </div>
          
          {!leftPanelCollapsed && (
            <div className="panel-content">
              <FileUploader onFilesLoaded={handleFilesLoaded} />

              {/* Información de validación */}
              {loadedJSONs.length > 0 && (
                <div className="validation-summary">
                  <h4>📊 Resumen de Archivos</h4>
                  <div className="validation-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">{validationInfo.total}</span>
                    </div>
                    <div className="stat-item success">
                      <span className="stat-label">Válidos:</span>
                      <span className="stat-value">{validationInfo.valid}</span>
                    </div>
                    {validationInfo.invalid > 0 && (
                      <div className="stat-item error">
                        <span className="stat-label">Con errores:</span>
                        <span className="stat-value">{validationInfo.invalid}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lista de JSONs */}
              <div className="json-list">
                <h3>Archivos ({loadedJSONs.length})</h3>
                {loadedJSONs.map(json => (
                  <div key={json.id} className={`json-item ${json.valid ? 'valid' : 'invalid'}`}>
                    <div className="json-info">
                      <span className="json-name" title={json.name}>
                        {json.name}
                      </span>
                      <div className="json-meta">
                        {json.valid ? (
                          <span className="valid-indicator">✅ Válido</span>
                        ) : (
                          <span className="error-indicator" title={json.error}>
                            ⚠️ Error: {json.error?.substring(0, 50)}...
                          </span>
                        )}
                        <span className="file-size">
                          {formatFileSize(json.size)}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveJSON(json.id)}
                      className="remove-btn"
                      title="Remover archivo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {loadedJSONs.length === 0 && (
                  <p className="empty-state">No hay archivos cargados</p>
                )}
              </div>
            </div>
          )}

          {/* Contenido colapsado */}
          {leftPanelCollapsed && (
            <div className="collapsed-content">
              <div className="collapsed-indicator">
                📁
                <span className="file-count">{loadedJSONs.length}</span>
              </div>
            </div>
          )}
        </aside>

        {/* Panel Central - Vista Comparativa */}
        <section className="center-panel">
          <div className="panel-header">
            <h2>Comparación de Estructuras</h2>
            {loadedJSONs.length > 0 && (
              <div className="comparison-stats">
                <span className="stat">
                  📊 {validationInfo.valid} archivos comparados
                </span>
                {selectedProperties.size > 0 && (
                  <span className="stat">
                    ✅ {selectedProperties.size} propiedades seleccionadas
                  </span>
                )}
                {stats && (
                  <span className="stat">
                    🏗️ {stats.totalProperties} propiedades encontradas
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="panel-content">
            {loadedJSONs.length === 0 ? (
              <div className="empty-comparison">
                <h3>👋 ¡Bienvenido al JSON Documentador!</h3>
                <p>Para comenzar:</p>
                <ol>
                  <li>Carga múltiples archivos JSON del mismo endpoint</li>
                  <li>Visualiza la comparación automática de estructuras</li>
                  <li>Selecciona propiedades para crear templates</li>
                  <li>Exporta la documentación generada</li>
                </ol>
              </div>
            ) : isProcessing ? (
              <div className="processing">
                <div className="processing-indicator">
                  <div className="spinner"></div>
                  <p>🔄 Analizando estructuras JSON...</p>
                  <span className="processing-details">
                    Comparando {validationInfo.valid} archivos válidos
                  </span>
                </div>
              </div>
            ) : hasComparison ? (
              <div className="comparison-results">
                {/* Estadísticas de comparación */}
                <div className="comparison-overview">
                  <div className="overview-grid">
                    <div className="overview-card">
                      <div className="card-icon">📄</div>
                      <div className="card-content">
                        <div className="card-value">{stats?.totalProperties || 0}</div>
                        <div className="card-label">Total Propiedades</div>
                      </div>
                    </div>
                    
                    <div className="overview-card required">
                      <div className="card-icon">✅</div>
                      <div className="card-content">
                        <div className="card-value">{stats?.requiredProperties || 0}</div>
                        <div className="card-label">Requeridas</div>
                      </div>
                    </div>
                    
                    <div className="overview-card optional">
                      <div className="card-icon">❓</div>
                      <div className="card-content">
                        <div className="card-value">{stats?.optionalProperties || 0}</div>
                        <div className="card-label">Opcionales</div>
                      </div>
                    </div>
                    
                    {stats?.conflictProperties > 0 && (
                      <div className="overview-card conflict">
                        <div className="card-icon">⚠️</div>
                        <div className="card-content">
                          <div className="card-value">{stats.conflictProperties}</div>
                          <div className="card-label">Conflictos</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="overview-card depth">
                      <div className="card-icon">🌳</div>
                      <div className="card-content">
                        <div className="card-value">{stats?.maxDepth || 0}</div>
                        <div className="card-label">Niveles Max</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PropertyTree Component */}
                <PropertyTree 
                  comparisonResult={comparisonResult}
                  selectedProperties={selectedProperties}
                  onPropertyToggle={handlePropertyToggle}
                />
              </div>
            ) : (
              <div className="no-comparison">
                <h3>⚠️ No se pudo generar comparación</h3>
                <p>Verifica que los archivos JSON sean válidos</p>
                {validationInfo.invalid > 0 && (
                  <p className="error-hint">
                    Hay {validationInfo.invalid} archivo(s) con errores que no se pudieron procesar
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Panel Derecho - Template Builder */}
        <aside className={`right-panel ${rightPanelCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-header">
            <h2>{rightPanelCollapsed ? 'Temp' : 'Template Builder'}</h2>
            <button 
              className="collapse-btn"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              title={rightPanelCollapsed ? 'Expandir panel' : 'Contraer panel'}
            >
              {rightPanelCollapsed ? '←' : '→'}
            </button>
          </div>

          {!rightPanelCollapsed && (
            <div className="panel-content">
              {selectedProperties.size > 0 ? (
                <div className="template-builder">
                  {/* Header con estadísticas */}
                  <div className="template-header">
                    <h3>🎯 Template Generator</h3>
                    <div className="template-meta">
                      <span className="meta-item">
                        📋 {selectedProperties.size} propiedades
                      </span>
                      {hasTemplate && (
                        <span className="meta-item">
                          🏗️ {templateStats?.totalProperties || 0} generadas
                        </span>
                      )}
                      {hasArrays && (
                        <span className="meta-item">
                          📊 {getAvailableArrays().length} arrays
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Configuración del template */}
                  <div className="template-config">
                    <div className="config-group">
                      <label>Nombre del template:</label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Mi template personalizado"
                        className="template-name-input"
                      />
                    </div>

                    {/* Configuración de arrays */}
                    {hasArrays && (
                      <div className="config-group">
                        <label>Configuración de Arrays:</label>
                        <div className="array-configs">
                          {getAvailableArrays().map(arrayPath => (
                            <div key={arrayPath} className="array-config-item">
                              <span className="array-name">{arrayPath}:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={getArrayCount(arrayPath)}
                                onChange={(e) => setArrayCount(arrayPath, parseInt(e.target.value) || 1)}
                                className="array-count-input"
                              />
                              <span className="array-label">elementos</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Propiedades seleccionadas */}
                  <div className="selected-properties">
                    <div className="properties-header">
                      <h4>Propiedades Seleccionadas</h4>
                      <button 
                        onClick={handleClearSelection}
                        className="clear-selection-btn"
                        title="Limpiar selección"
                      >
                        🗑️ Limpiar
                      </button>
                    </div>
                    <div className="properties-list">
                      {Array.from(selectedProperties).map(prop => (
                        <div key={prop} className="property-item">
                          <span className="property-path">{prop}</span>
                          <button 
                            onClick={() => handlePropertyToggle(prop)}
                            className="remove-property"
                            title="Remover propiedad"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview del JSON */}
                  <div className="json-preview">
                    <div className="preview-header">
                      <h4>Preview del Template</h4>
                      {hasTemplate && (
                        <div className="preview-status">
                          {isValid ? (
                            <span className="status-valid">✅ Válido</span>
                          ) : (
                            <span className="status-invalid">❌ Inválido</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="preview-container">
                      <pre className="json-display">
                        {hasTemplate ? formattedTemplate : '{\n  "message": "Selecciona propiedades para generar template"\n}'}
                      </pre>
                    </div>
                  </div>

                  {/* Controles de export */}
                  <div className="export-controls">
                    <button 
                      className="export-btn primary"
                      onClick={handleExportTemplate}
                      disabled={!hasTemplate}
                      title={hasTemplate ? "Descargar template como archivo JSON" : "Selecciona propiedades primero"}
                    >
                      📥 Descargar JSON
                    </button>
                    <button 
                      className="export-btn secondary"
                      onClick={handleCopyToClipboard}
                      disabled={!hasTemplate}
                      title={hasTemplate ? "Copiar template al portapapeles" : "Selecciona propiedades primero"}
                    >
                      📋 Copiar al portapapeles
                    </button>
                  </div>

                  {/* Estadísticas del template */}
                  {hasTemplate && templateStats && (
                    <div className="template-statistics">
                      <h4>📊 Estadísticas del Template</h4>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <span className="stat-number">{templateStats.totalProperties}</span>
                          <span className="stat-label">Total</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-number">{templateStats.primitiveProperties}</span>
                          <span className="stat-label">Primitivas</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-number">{templateStats.objectProperties}</span>
                          <span className="stat-label">Objetos</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-number">{templateStats.arrayProperties}</span>
                          <span className="stat-label">Arrays</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="template-empty">
                  <h3>🎯 Construye tu Template</h3>
                  <p>Selecciona propiedades del panel central para:</p>
                  <ul>
                    <li>Crear templates de request con <strong>datos reales</strong></li>
                    <li>Configurar arrays con N elementos personalizados</li>
                    <li>Exportar JSON estructurado y válido</li>
                    <li>Generar documentación automática</li>
                  </ul>
                  
                  {hasComparison && (
                    <div className="template-stats">
                      <p className="stats-hint">
                        💡 Tienes <strong>{stats?.totalProperties || 0} propiedades</strong> disponibles para seleccionar
                      </p>
                      <p className="stats-hint">
                        ✅ <strong>{stats?.requiredProperties || 0}</strong> son requeridas (aparecen en todos los archivos)
                      </p>
                      <p className="stats-hint">
                        🔥 <strong>Nuevo:</strong> Los templates usan datos reales de tus JSONs
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contenido colapsado */}
          {rightPanelCollapsed && (
            <div className="collapsed-content">
              <div className="collapsed-indicator">
                🎯
                <span className="selected-count">{selectedProperties.size}</span>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

// Utility function para formatear tamaño de archivo
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default App;