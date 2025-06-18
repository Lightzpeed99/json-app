import React, { useState } from 'react';
import './App.css';
import FileUploader from './components/FileUploader';
import PropertyTree from './components/PropertyTree';
import { useJSONComparison } from './hooks/useJSONComparison';
import { useTemplateBuilder } from './hooks/useTemplateBuilder';
import { 
  applySmartSelection, 
  toggleNodeExpansion 
} from './utils/smartSelection';

const App = () => {
  // Estado global de la aplicación
  const [loadedJSONs, setLoadedJSONs] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState(new Set());
  const [showFileModal, setShowFileModal] = useState(false);
  const [showJSONSettings, setShowJSONSettings] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);
  const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(false);
  const [templatePanelWidth, setTemplatePanelWidth] = useState(350);
  const [searchText, setSearchText] = useState('');

  // Hook de comparación JSON
  const {
    comparisonResult,
    isProcessing,
    stats,
    hasComparison,
    validationInfo,
    expandedPaths,
    setExpandedPaths,
    expandAll,
    collapseAll
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
    hasTemplate,
    hasArrays,
    isValid
  } = useTemplateBuilder(selectedProperties, loadedJSONs, comparisonResult);

  // Handlers para gestión de JSONs
  const handleFilesLoaded = (files) => {
    setLoadedJSONs(prev => [...prev, ...files]);
    setShowFileModal(false);
  };

  const handleRemoveJSON = (id) => {
    setLoadedJSONs(prev => prev.filter(json => json.id !== id));
  };

  // Handler para selección de propiedades
  const handlePropertyToggle = (propertyPath) => {
    const newSelection = applySmartSelection(propertyPath, selectedProperties, comparisonResult);
    setSelectedProperties(newSelection);
  };

  // Handler para expansión
  const handleToggleExpanded = (path) => {
    const newExpandedPaths = toggleNodeExpansion(path, expandedPaths);
    setExpandedPaths(newExpandedPaths);
  };

  // Handler para configuración de arrays
  const handleArrayCountChange = (arrayPath, count) => {
    setArrayCount(arrayPath, count);
  };

  // Handlers para template builder
  const handleExportTemplate = async () => {
    const filename = templateName || `template_${new Date().toISOString().slice(0, 10)}`;
    exportAsFile(filename);
  };

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard();
    if (success) {
      console.log('Template copiado al portapapeles');
    } else {
      console.log('Error al copiar template');
    }
  };

  // Handlers para controles simplificados
  const handleSelectAll = () => {
    if (!comparisonResult) return;
    const allPaths = Object.keys(comparisonResult);
    const newSelection = new Set(allPaths);
    setSelectedProperties(newSelection);
  };

  const handleDeselectAll = () => {
    setSelectedProperties(new Set());
  };

  const handleExpandAll = () => {
    expandAll();
  };

  const handleCollapseAll = () => {
    collapseAll();
  };

  // Handler para redimensionar panel
  const handleMouseDown = (e) => {
    const startX = e.clientX;
    const startWidth = templatePanelWidth;
    const maxWidth = window.innerWidth / 2;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(300, Math.min(maxWidth, startWidth - (e.clientX - startX)));
      setTemplatePanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="app">
      {/* HEADER COMPACTO - MÁXIMO 2 LÍNEAS */}
      <header className="app-header-compact">
        {/* LÍNEA 1: Título + Botones + Estadísticas */}
        <div className="header-line-1">
          <div className="header-title-compact">
            <h1>JSON Documentador</h1>
            <p>Compara estructuras JSON y genera templates</p>
          </div>
          
          {/* Botones principales - SOLO SI HAY ARCHIVOS */}
          <div className="header-actions">
            {loadedJSONs.length > 0 && (
              <>
                <button 
                  className="action-btn"
                  onClick={() => setShowFileModal(true)}
                  title="Cargar más archivos JSON"
                >
                  📁 Cargar JSONs
                </button>
                
                <button 
                  className="action-btn secondary"
                  onClick={() => setShowJSONSettings(true)}
                  title="Configuración de JSONs"
                >
                  ⚙️ JSON Settings
                </button>
              </>
            )}
          </div>

          {/* Estadísticas y controles en línea */}
          {loadedJSONs.length > 0 && (
            <div className="header-stats-inline">
              {/* Badge de archivos clickeable */}
              <div 
                className="files-badge"
                onClick={() => setShowFilesList(!showFilesList)}
                title="Ver archivos cargados"
              >
                📊 {validationInfo.total} archivos
                {validationInfo.valid > 0 && (
                  <span className="badge-success">✅ {validationInfo.valid}</span>
                )}
                {validationInfo.invalid > 0 && (
                  <span className="badge-error">❌ {validationInfo.invalid}</span>
                )}
              </div>

              {/* Estadísticas de comparación */}
              {hasComparison && stats && (
                <>
                  <div className="stat-inline">
                    <span className="stat-value">{stats.totalProperties || 0}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  
                  <div className="stat-inline success">
                    <span className="stat-value">{stats.requiredProperties || 0}</span>
                    <span className="stat-label">Requeridas</span>
                  </div>
                  
                  <div className="stat-inline warning">
                    <span className="stat-value">{stats.optionalProperties || 0}</span>
                    <span className="stat-label">Opcionales</span>
                  </div>

                  {selectedProperties.size > 0 && (
                    <div className="stat-inline selected">
                      <span className="stat-value">{selectedProperties.size}</span>
                      <span className="stat-label">Seleccionadas</span>
                    </div>
                  )}

                  {/* Controles en línea */}
                  <div className="controls-inline">
                    <button onClick={handleExpandAll} className="control-btn-inline expand">
                      ⬇️ Expandir Todo
                    </button>
                    <button onClick={handleCollapseAll} className="control-btn-inline collapse">
                      ⬆️ Colapsar Todo
                    </button>
                    <button onClick={handleSelectAll} className="control-btn-inline select">
                      ✅ Seleccionar Todo
                    </button>
                    <button onClick={handleDeselectAll} className="control-btn-inline deselect">
                      ❌ Deseleccionar Todo
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* LÍNEA 2: Búsqueda - SOLO SI HAY COMPARACIÓN */}
        {hasComparison && (
          <div className="header-line-2">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 Buscar propiedades..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-header"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="search-clear"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* LAYOUT PRINCIPAL - Redimensionable */}
      <main className="app-main-resizable" style={{
        gridTemplateColumns: isTemplateCollapsed ? '1fr 60px' : `1fr ${templatePanelWidth}px`
      }}>
        {/* Panel Central - Comparación */}
        <section className="center-panel">
          {loadedJSONs.length === 0 ? (
            <div className="empty-comparison">
              <h3>👋 ¡Comienza cargando archivos JSON!</h3>
              <p>Haz clic en el botón para comparar estructuras</p>
              <button 
                className="start-btn"
                onClick={() => setShowFileModal(true)}
              >
                📁 Cargar Archivos JSON
              </button>
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
            <PropertyTree 
              comparisonResult={comparisonResult}
              selectedProperties={selectedProperties}
              onPropertyToggle={handlePropertyToggle}
              expandedPaths={expandedPaths}
              onToggleExpanded={handleToggleExpanded}
              arrayConfig={arrayConfig}
              onArrayCountChange={handleArrayCountChange}
              searchText={searchText}
            />
          ) : (
            <div className="no-comparison">
              <h3>⚠️ No se pudo generar comparación</h3>
              <p>Verifica que los archivos JSON sean válidos</p>
              {validationInfo.invalid > 0 && (
                <p className="error-hint">
                  Hay {validationInfo.invalid} archivo(s) con errores
                </p>
              )}
            </div>
          )}
        </section>

        {/* Panel Template - Colapsable y Redimensionable */}
        <aside className={`template-panel-resizable ${isTemplateCollapsed ? 'collapsed' : ''}`}>
          {/* Handle de resize */}
          {!isTemplateCollapsed && (
            <div className="resize-handle" onMouseDown={handleMouseDown}></div>
          )}
          
          <div className="panel-header">
            <h2>{isTemplateCollapsed ? 'T' : 'Template Builder'}</h2>
            <button 
              className="collapse-btn"
              onClick={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
              title={isTemplateCollapsed ? 'Expandir panel' : 'Contraer panel'}
            >
              {isTemplateCollapsed ? '←' : '→'}
            </button>
          </div>

          {!isTemplateCollapsed && (
            <div className="panel-content">
              {selectedProperties.size > 0 ? (
                <div className="template-builder">
                  {/* Preview del JSON - SIN estadísticas redundantes */}
                  <div className="json-preview-only">
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
                    
                    <div className="preview-container-fixed">
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
                    >
                      📥 Descargar JSON
                    </button>
                    <button 
                      className="export-btn secondary"
                      onClick={handleCopyToClipboard}
                      disabled={!hasTemplate}
                    >
                      📋 Copiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="template-empty">
                  <h3>🎯 Construye tu Template</h3>
                  <p>Selecciona propiedades del árbol para generar un template JSON con datos reales.</p>
                </div>
              )}
            </div>
          )}

          {/* Estado colapsado */}
          {isTemplateCollapsed && (
            <div className="collapsed-content">
              <div className="collapsed-indicator">
                🎯
                {selectedProperties.size > 0 && (
                  <span className="selected-count">{selectedProperties.size}</span>
                )}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Modal para carga de archivos - SIN lista integrada */}
      {showFileModal && (
        <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 Cargar Archivos JSON</h3>
              <button 
                className="modal-close"
                onClick={() => setShowFileModal(false)}
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <FileUploader onFilesLoaded={handleFilesLoaded} />
            </div>
          </div>
        </div>
      )}

      {/* Modal JSON Settings */}
      {showJSONSettings && (
        <div className="modal-overlay" onClick={() => setShowJSONSettings(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ JSON Settings</h3>
              <button 
                className="modal-close"
                onClick={() => setShowJSONSettings(false)}
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              {/* Configuración del template */}
              {selectedProperties.size > 0 && (
                <div className="settings-section">
                  <h4>🎯 Configuración del Template</h4>
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
                      <label>Arrays configurables:</label>
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

                  {/* Estadísticas del template */}
                  {hasTemplate && templateStats && (
                    <div className="settings-section">
                      <h4>📊 Estadísticas del Template</h4>
                      <div className="stats-grid">
                        <div className="stat-card-small">
                          <span className="stat-number">{templateStats.totalProperties}</span>
                          <span className="stat-label">Total</span>
                        </div>
                        <div className="stat-card-small">
                          <span className="stat-number">{templateStats.arrayProperties}</span>
                          <span className="stat-label">Arrays</span>
                        </div>
                        <div className="stat-card-small">
                          <span className="stat-number">{templateStats.objectProperties}</span>
                          <span className="stat-label">Objetos</span>
                        </div>
                        <div className="stat-card-small">
                          <span className="stat-number">{templateStats.primitiveProperties}</span>
                          <span className="stat-label">Primitivas</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dropdown lista de archivos - POSICIÓN ABSOLUTA CORRECTA */}
      {showFilesList && loadedJSONs.length > 0 && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div 
            className="dropdown-overlay"
            onClick={() => setShowFilesList(false)}
          />
          <div className="files-dropdown">
            <div className="files-dropdown-header">
              <h4>📁 Archivos Cargados ({loadedJSONs.length})</h4>
              <button 
                onClick={() => setShowFilesList(false)}
                className="dropdown-close"
              >
                ✕
              </button>
            </div>
            <div className="files-dropdown-list">
              {loadedJSONs.map(json => (
                <div key={json.id} className={`file-dropdown-item ${json.valid ? 'valid' : 'invalid'}`}>
                  <div className="file-dropdown-info">
                    <span className="file-dropdown-name" title={json.name}>
                      {json.name}
                    </span>
                    <span className={`file-dropdown-status ${json.valid ? 'valid' : 'invalid'}`}>
                      {json.valid ? '✅' : '❌'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleRemoveJSON(json.id)}
                    className="remove-file-dropdown"
                    title="Remover archivo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;