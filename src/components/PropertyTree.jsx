import React, { useState, useMemo } from 'react';
import { 
  buildTreeStructure, 
  applySmartSelection,
  isArrayParent,
  hasChildren
} from '../utils/smartSelection';

const PropertyTree = ({ 
  comparisonResult, 
  selectedProperties = new Set(), 
  onPropertyToggle = () => {},
  expandedPaths = new Set(),
  onToggleExpanded = () => {},
  arrayConfig = {},
  onArrayCountChange = () => {}
}) => {
  const [searchText, setSearchText] = useState('');
  const [arrayTooltip, setArrayTooltip] = useState({ visible: false, arrayPath: '', x: 0, y: 0 });

  if (!comparisonResult) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
        No hay datos para mostrar
      </div>
    );
  }

  // Filtrar propiedades por búsqueda
  const filteredProperties = useMemo(() => {
    if (!searchText) return comparisonResult;
    
    const search = searchText.toLowerCase();
    return Object.fromEntries(
      Object.entries(comparisonResult).filter(([path, property]) =>
        path.toLowerCase().includes(search) ||
        property.key.toLowerCase().includes(search) ||
        property.type.toLowerCase().includes(search)
      )
    );
  }, [comparisonResult, searchText]);

  // Construir estructura de árbol jerárquica
  const treeNodes = useMemo(() => {
    return buildTreeStructure(filteredProperties, expandedPaths);
  }, [filteredProperties, expandedPaths]);

  // Detectar arrays configurables
  const detectableArrays = useMemo(() => {
    const arrays = new Set();
    Array.from(selectedProperties).forEach(path => {
      if (path.includes('[0]')) {
        const arrayPath = path.split('[0]')[0].replace(/\.$/, '');
        arrays.add(arrayPath);
      }
    });
    return arrays;
  }, [selectedProperties]);

  // NUEVAS FUNCIONES DE SELECCIÓN RÁPIDA
  const handleSelectAll = () => {
    const allPaths = Object.keys(comparisonResult);
    allPaths.forEach(path => {
      if (!selectedProperties.has(path)) {
        onPropertyToggle(path);
      }
    });
  };

  const handleSelectNone = () => {
    Array.from(selectedProperties).forEach(path => {
      onPropertyToggle(path);
    });
  };

  const handleSelectByLevel = (level) => {
    const levelPaths = Object.entries(comparisonResult)
      .filter(([_, property]) => property.level === level)
      .map(([path]) => path);
    
    levelPaths.forEach(path => {
      if (!selectedProperties.has(path)) {
        onPropertyToggle(path);
      }
    });
  };

  const handleDeselectByLevel = (level) => {
    const levelPaths = Object.entries(comparisonResult)
      .filter(([_, property]) => property.level === level)
      .map(([path]) => path);
    
    levelPaths.forEach(path => {
      if (selectedProperties.has(path)) {
        onPropertyToggle(path);
      }
    });
  };

  const handleSelectObjects = () => {
    const objectPaths = Object.entries(comparisonResult)
      .filter(([_, property]) => property.type === 'object')
      .map(([path]) => path);
    
    objectPaths.forEach(path => {
      if (!selectedProperties.has(path)) {
        onPropertyToggle(path);
      }
    });
  };

  // NUEVA: Manejo de selección inteligente
  const handleSmartPropertyToggle = (path) => {
    const newSelection = applySmartSelection(path, selectedProperties, comparisonResult);
    
    // Aplicar cambios uno por uno para mantener consistencia
    const currentPaths = Array.from(selectedProperties);
    const newPaths = Array.from(newSelection);
    
    // Deseleccionar los que ya no están
    currentPaths.forEach(currentPath => {
      if (!newSelection.has(currentPath)) {
        onPropertyToggle(currentPath);
      }
    });
    
    // Seleccionar los nuevos
    newPaths.forEach(newPath => {
      if (!selectedProperties.has(newPath)) {
        onPropertyToggle(newPath);
      }
    });
  };

  // NUEVA: Manejo de expand/collapse
  const handleToggleExpand = (path) => {
    onToggleExpanded(path);
  };

  // TOOLTIP DE ARRAYS
  const handleArrayClick = (arrayPath, event) => {
    event.stopPropagation();
    const rect = event.target.getBoundingClientRect();
    setArrayTooltip({
      visible: true,
      arrayPath,
      x: rect.left,
      y: rect.bottom + 5
    });
  };

  const handleArrayCountSubmit = (newCount) => {
    if (newCount && newCount > 0) {
      onArrayCountChange(arrayTooltip.arrayPath, parseInt(newCount));
    }
    setArrayTooltip({ visible: false, arrayPath: '', x: 0, y: 0 });
  };

  // Verificar si una propiedad es un array configurable
  const isConfigurableArray = (property) => {
    return property.type === 'array' && detectableArrays.has(property.path);
  };

  // NUEVA: Renderizar nodo individual jerárquico
  const renderTreeNode = (node, index) => {
    const levelColor = getLevelColor(node.level || 0);
    const isArray = isConfigurableArray(node);
    const currentCount = arrayConfig[node.path]?.count || 2;
    const isSelected = selectedProperties.has(node.path);
    const canExpand = node.hasChildren;
    const isExpanded = node.isExpanded;
    
    return (
      <div 
        key={node.path}
        style={{
          marginBottom: '2px',
          marginLeft: `${(node.level || 0) * 20}px`
        }}
      >
        <div style={{
          padding: '0.75rem',
          background: levelColor.bg,
          borderRadius: '6px',
          borderLeft: `4px solid ${node.isRequired ? '#059669' : '#d97706'}`,
          border: isSelected ? '2px solid #2563eb' : '1px solid #475569',
          transition: 'all 0.15s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* NUEVO: Botón de expand/collapse */}
            {canExpand && (
              <button
                onClick={() => handleToggleExpand(node.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '3px',
                  transition: 'all 0.15s ease',
                  minWidth: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem'
                }}
                title={isExpanded ? 'Colapsar' : 'Expandir'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            
            {/* Spacer si no tiene botón expand */}
            {!canExpand && (
              <div style={{ minWidth: '20px' }}></div>
            )}
            
            {/* Checkbox con selección inteligente */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSmartPropertyToggle(node.path)}
              style={{
                cursor: 'pointer',
                transform: 'scale(1.2)',
                accentColor: '#2563eb'
              }}
            />
            
            {/* Property info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.25rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ 
                  color: levelColor.text,
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}>
                  {node.key}
                </span>

                {/* INDICADOR: Array configurable */}
                {isArray && (
                  <span 
                    onClick={(e) => handleArrayClick(node.path, e)}
                    style={{
                      background: '#06b6d4',
                      color: 'white',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.15s ease'
                    }}
                    title="Click para configurar cantidad de elementos"
                  >
                    🔢 {currentCount}
                  </span>
                )}

                {/* INDICADOR: Array padre */}
                {node.isArrayParent && (
                  <span style={{
                    background: '#8b5cf6',
                    color: 'white',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    📋 Array
                  </span>
                )}
                
                <span style={{
                  background: '#475569',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  {getTypeIcon(node.type)} {node.type}
                </span>
                
                <span style={{
                  background: node.isRequired ? '#059669' : '#d97706',
                  color: 'white',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {node.frequencyText}
                </span>

                {node.frequencyPercent && (
                  <span style={{
                    background: '#374151',
                    color: '#9ca3af',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem'
                  }}>
                    {node.frequencyPercent}%
                  </span>
                )}
              </div>
              
              <div style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {node.path}
              </div>
              
              {/* Información adicional */}
              {node.missing && node.missing.length > 0 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#f59e0b',
                  marginTop: '0.25rem'
                }}>
                  ⚠️ Falta en: {node.missing.join(', ')}
                </div>
              )}

              {node.type === 'mixed' && node.conflicts && node.conflicts.length > 0 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  marginTop: '0.25rem'
                }}>
                  🔥 Conflicto de tipos detectado
                </div>
              )}

              {node.examples && node.examples.length > 0 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem',
                  fontStyle: 'italic'
                }}>
                  Ejemplo: {JSON.stringify(node.examples[0].value).substring(0, 50)}
                  {JSON.stringify(node.examples[0].value).length > 50 ? '...' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Obtener colores por nivel
  const getLevelColor = (level) => {
    const colors = [
      { bg: 'rgba(37, 99, 235, 0.1)', text: '#60a5fa' },   // Nivel 0 - Azul
      { bg: 'rgba(6, 182, 212, 0.1)', text: '#22d3ee' },   // Nivel 1 - Cyan
      { bg: 'rgba(5, 150, 105, 0.1)', text: '#34d399' },   // Nivel 2 - Verde
      { bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24' },  // Nivel 3 - Amarillo
      { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171' },   // Nivel 4 - Rojo
      { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa' },  // Nivel 5 - Púrpura
      { bg: 'rgba(236, 72, 153, 0.1)', text: '#f472b6' },  // Nivel 6 - Rosa
    ];
    return colors[level % colors.length] || colors[0];
  };

  // Iconos por tipo
  const getTypeIcon = (type) => {
    const icons = {
      'string': '📝',
      'number': '🔢',
      'integer': '🔢',
      'boolean': '☑️',
      'object': '📦',
      'array': '📋',
      'null': '⭕',
      'date': '📅',
      'email': '📧',
      'url': '🔗',
      'mixed': '⚠️'
    };
    return icons[type] || '❓';
  };

  const totalCount = treeNodes.length;
  const selectedCount = selectedProperties.size;
  const requiredCount = treeNodes.filter(p => p.isRequired).length;
  const optionalCount = totalCount - requiredCount;

  // Obtener niveles disponibles
  const availableLevels = [...new Set(Object.values(comparisonResult).map(p => p.level))].sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', position: 'relative' }}>
      {/* Header con filtros y controles */}
      <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <h3 style={{ color: '#f8fafc', margin: 0 }}>
            🌳 Árbol de Propiedades
          </h3>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#cbd5e1',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <span>{totalCount} visibles</span>
            <span style={{ color: '#34d399' }}>{requiredCount} requeridas</span>
            <span style={{ color: '#fbbf24' }}>{optionalCount} opcionales</span>
            {selectedCount > 0 && (
              <span style={{ color: '#60a5fa' }}>{selectedCount} seleccionadas</span>
            )}
          </div>
        </div>

        {/* Controles de selección rápida */}
        <div style={{ 
          marginBottom: '1rem',
          padding: '1rem',
          background: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #475569'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.9rem', marginRight: '0.5rem' }}>
              Selección rápida:
            </span>
            
            {/* Botones de selección */}
            <button onClick={handleSelectAll} style={buttonStyle}>Todas</button>
            
            {availableLevels.map(level => (
              <button 
                key={`select-${level}`}
                onClick={() => handleSelectByLevel(level)} 
                style={buttonStyle}
              >
                Nivel {level}
              </button>
            ))}
            
            <button onClick={handleSelectObjects} style={buttonStyle}>Objetos</button>
            
            {/* Separador */}
            <div style={{ height: '20px', width: '1px', background: '#475569', margin: '0 0.5rem' }}></div>
            
            {/* Botones de deselección */}
            <button onClick={handleSelectNone} style={buttonStyleRed}>Ninguna</button>
            
            {availableLevels.map(level => (
              <button 
                key={`deselect-${level}`}
                onClick={() => handleDeselectByLevel(level)} 
                style={buttonStyleRed}
              >
                Des-Nivel {level}
              </button>
            ))}
          </div>
        </div>
        
        {/* Barra de búsqueda */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Buscar propiedades..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.875rem'
            }}
          />
          
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              style={{
                background: '#dc2626',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido del árbol - CON SCROLL */}
      <div className="tree-content" style={{ 
        background: '#1e293b', 
        padding: '1rem', 
        borderRadius: '8px',
        border: '1px solid #475569',
        flex: 1,
        overflowY: 'auto'
      }}>
        {treeNodes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
            {searchText ? 'No se encontraron propiedades con ese filtro' : 'No hay propiedades para mostrar'}
          </div>
        ) : (
          <div>
            {treeNodes.map((node, index) => renderTreeNode(node, index))}
            
            {totalCount > 0 && (
              <div style={{ 
                textAlign: 'center', 
                color: '#94a3b8', 
                marginTop: '1rem',
                padding: '1rem',
                borderTop: '1px solid #475569',
                fontSize: '0.875rem'
              }}>
                {searchText ? 
                  `Mostrando ${totalCount} de ${Object.keys(comparisonResult).length} propiedades` :
                  `Total: ${totalCount} nodos visibles en el árbol`
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip para configurar arrays */}
      {arrayTooltip.visible && (
        <ArrayTooltip 
          x={arrayTooltip.x}
          y={arrayTooltip.y}
          arrayPath={arrayTooltip.arrayPath}
          currentCount={arrayConfig[arrayTooltip.arrayPath]?.count || 2}
          onSubmit={handleArrayCountSubmit}
          onClose={() => setArrayTooltip({ visible: false, arrayPath: '', x: 0, y: 0 })}
        />
      )}
    </div>
  );
};

// Componente Tooltip para arrays
const ArrayTooltip = ({ x, y, arrayPath, currentCount, onSubmit, onClose }) => {
  const [count, setCount] = useState(currentCount.toString());

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(count);
  };

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y,
      background: '#0f172a',
      border: '2px solid #06b6d4',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{ color: '#f8fafc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
        Configurar array: <strong>{arrayPath}</strong>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="number"
          min="1"
          max="10"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          style={{
            padding: '0.25rem 0.5rem',
            background: '#334155',
            border: '1px solid #475569',
            borderRadius: '4px',
            color: '#f8fafc',
            width: '60px',
            textAlign: 'center'
          }}
          autoFocus
        />
        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>elementos</span>
        
        <button type="submit" style={{
          background: '#06b6d4',
          border: 'none',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.8rem'
        }}>
          ✓
        </button>
        
        <button type="button" onClick={onClose} style={{
          background: '#dc2626',
          border: 'none',
          color: 'white',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.8rem'
        }}>
          ✕
        </button>
      </form>
    </div>
  );
};

// Estilos para botones
const buttonStyle = {
  background: '#2563eb',
  border: 'none',
  color: 'white',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  transition: 'all 0.15s ease'
};

const buttonStyleRed = {
  background: '#dc2626',
  border: 'none',
  color: 'white',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  transition: 'all 0.15s ease'
};

export default PropertyTree;