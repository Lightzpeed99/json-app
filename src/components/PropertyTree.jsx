import React, { useMemo } from 'react';
import { 
  buildTreeStructure, 
  applySmartSelection,
  isArrayParent,
  hasChildren,
  getDirectParent
} from '../utils/smartSelection';

const PropertyTree = ({ 
  comparisonResult, 
  selectedProperties = new Set(), 
  onPropertyToggle = () => {},
  expandedPaths = new Set(),
  onToggleExpanded = () => {},
  arrayConfig = {},
  onArrayCountChange = () => {},
  searchText = '' // NUEVO: Búsqueda desde props
}) => {
  // Estado para tooltip de arrays
  const [arrayTooltip, setArrayTooltip] = React.useState({ 
    visible: false, 
    arrayPath: '', 
    x: 0, 
    y: 0 
  });

  if (!comparisonResult) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: '#cbd5e1',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌳</div>
          <div>No hay datos para mostrar</div>
        </div>
      </div>
    );
  }

  // Filtrar propiedades por búsqueda (desde props)
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

  // SELECCIÓN CON CADENA COMPLETA DE PADRES
  const handleSmartPropertyToggle = (path) => {
    const isCurrentlySelected = selectedProperties.has(path);
    
    if (isCurrentlySelected) {
      // DESELECCIONAR: Usar lógica existente
      onPropertyToggle(path);
    } else {
      // SELECCIONAR: Asegurar cadena completa de padres
      const pathsToSelect = [];
      
      // Obtener todos los padres en orden desde la raíz
      const getAllParents = (targetPath) => {
        const parents = [];
        let currentPath = targetPath;
        
        while (currentPath) {
          const parent = getDirectParent(currentPath, comparisonResult);
          if (parent && !selectedProperties.has(parent)) {
            parents.unshift(parent); // Agregar al inicio para orden correcto
          }
          currentPath = parent;
        }
        
        return parents;
      };
      
      // Obtener la cadena completa: padres + propiedad objetivo
      const requiredParents = getAllParents(path);
      const fullChain = [...requiredParents, path];
      
      // Selección secuencial para asegurar actualización visual
      fullChain.forEach((targetPath, index) => {
        setTimeout(() => {
          if (!selectedProperties.has(targetPath)) {
            onPropertyToggle(targetPath);
          }
        }, index * 30); // 30ms de delay entre cada selección
      });
    }
  };

  // Manejo de expand/collapse
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

  // Verificar si el checkbox debe estar indeterminado
  const isNodeIndeterminate = (nodePath) => {
    if (!hasChildren(nodePath, comparisonResult)) return false;
    
    // Obtener todos los descendientes
    const allDescendants = Object.keys(comparisonResult).filter(path => 
      path.startsWith(nodePath + '.') || path.startsWith(nodePath + '[0].')
    );
    
    if (allDescendants.length === 0) return false;
    
    const selectedDescendants = allDescendants.filter(path => selectedProperties.has(path));
    
    // Indeterminado si algunos (pero no todos) los descendientes están seleccionados
    return selectedDescendants.length > 0 && selectedDescendants.length < allDescendants.length;
  };

  // Obtener estado visual completo del nodo
  const getNodeVisualState = (nodePath) => {
    const isSelected = selectedProperties.has(nodePath);
    const isIndeterminate = isNodeIndeterminate(nodePath);
    
    return {
      isSelected,
      isIndeterminate,
      showBorder: isSelected,
      showBadge: isSelected,
      borderColor: isSelected ? '#2563eb' : '#475569',
      boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
    };
  };

  // Renderizar nodo individual con feedback visual mejorado
  const renderTreeNode = (node, index) => {
    const levelColor = getLevelColor(node.level || 0);
    const isArray = isConfigurableArray(node);
    const currentCount = arrayConfig[node.path]?.count || 2;
    
    // Usar la función de estado visual
    const visualState = getNodeVisualState(node.path);
    const canExpand = node.hasChildren;
    const isExpanded = node.isExpanded;
    
    return (
      <div 
        key={`${node.path}-${selectedProperties.size}-${Date.now()}`}
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
          border: visualState.showBorder ? `2px solid ${visualState.borderColor}` : '1px solid #475569',
          transition: 'all 0.15s ease',
          boxShadow: visualState.boxShadow
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Botón de expand/collapse */}
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
            
            {/* Checkbox con estado visual sincronizado */}
            <input
              type="checkbox"
              checked={visualState.isSelected}
              ref={(el) => {
                if (el) el.indeterminate = visualState.isIndeterminate;
              }}
              onChange={() => handleSmartPropertyToggle(node.path)}
              style={{
                cursor: 'pointer',
                transform: 'scale(1.2)',
                accentColor: '#2563eb'
              }}
              title={
                visualState.isSelected ? 'Deseleccionar propiedad' :
                visualState.isIndeterminate ? 'Algunos hijos seleccionados' :
                'Seleccionar propiedad'
              }
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

                {/* Indicador visual de selección mejorado */}
                {visualState.showBadge && (
                  <span style={{
                    background: '#2563eb',
                    color: 'white',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    ✓ Seleccionado
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

              {/* Mostrar información de inclusión en template */}
              {visualState.isSelected && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#06b6d4',
                  marginTop: '0.25rem',
                  fontStyle: 'italic'
                }}>
                  📋 Incluido en template
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      position: 'relative' 
    }}>
      {/* SOLO ÁRBOL DE NODOS - SIN HEADERS NI RESÚMENES */}
      <div style={{ 
        background: '#1e293b', 
        padding: '1rem', 
        flex: 1,
        overflowY: 'auto'
      }}>
        {treeNodes.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#94a3b8', 
            padding: '2rem',
            background: '#334155',
            borderRadius: '8px',
            border: '1px solid #475569'
          }}>
            {searchText ? (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                <div>No se encontraron propiedades con "{searchText}"</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#64748b' }}>
                  Intenta con otro término de búsqueda
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌳</div>
                <div>No hay propiedades para mostrar</div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {treeNodes.map((node, index) => renderTreeNode(node, index))}
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

// Componente Tooltip para arrays (sin cambios)
const ArrayTooltip = ({ x, y, arrayPath, currentCount, onSubmit, onClose }) => {
  const [count, setCount] = React.useState(currentCount.toString());

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

export default PropertyTree;