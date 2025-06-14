import React, { useState, useMemo } from 'react';

const PropertyTree = ({ 
  comparisonResult, 
  selectedProperties = new Set(), 
  onPropertyToggle = () => {} 
}) => {
  const [searchText, setSearchText] = useState('');

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

  // Convertir a array y ordenar por path
  const propertiesArray = useMemo(() => {
    return Object.entries(filteredProperties)
      .map(([path, property]) => ({
        path,
        ...property,
        isSelected: selectedProperties.has(path)
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [filteredProperties, selectedProperties]);

  // Handlers
  const handlePropertySelect = (path) => {
    onPropertyToggle(path);
  };

  // Renderizar nodo individual
  const renderProperty = (property, index) => {
    const levelColor = getLevelColor(property.level || 0);
    
    return (
      <div 
        key={property.path}
        style={{
          padding: '0.75rem',
          marginBottom: '4px',
          background: levelColor.bg,
          borderRadius: '6px',
          borderLeft: `4px solid ${property.isRequired ? '#059669' : '#d97706'}`,
          border: property.isSelected ? '2px solid #2563eb' : '1px solid #475569',
          transition: 'all 0.15s ease',
          marginLeft: `${(property.level || 0) * 20}px`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={property.isSelected}
            onChange={() => handlePropertySelect(property.path)}
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
                {property.key}
              </span>
              
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
                {getTypeIcon(property.type)} {property.type}
              </span>
              
              <span style={{
                background: property.isRequired ? '#059669' : '#d97706',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {property.frequencyText}
              </span>

              {property.frequencyPercent && (
                <span style={{
                  background: '#374151',
                  color: '#9ca3af',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.7rem'
                }}>
                  {property.frequencyPercent}%
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
              {property.path}
            </div>
            
            {/* Información adicional */}
            {property.missing && property.missing.length > 0 && (
              <div style={{
                fontSize: '0.75rem',
                color: '#f59e0b',
                marginTop: '0.25rem'
              }}>
                ⚠️ Falta en: {property.missing.join(', ')}
              </div>
            )}

            {property.type === 'mixed' && property.conflicts && property.conflicts.length > 0 && (
              <div style={{
                fontSize: '0.75rem',
                color: '#ef4444',
                marginTop: '0.25rem'
              }}>
                🔥 Conflicto de tipos detectado
              </div>
            )}

            {property.examples && property.examples.length > 0 && (
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
                fontStyle: 'italic'
              }}>
                Ejemplo: {JSON.stringify(property.examples[0].value).substring(0, 50)}
                {JSON.stringify(property.examples[0].value).length > 50 ? '...' : ''}
              </div>
            )}
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

  const totalCount = propertiesArray.length;
  const selectedCount = selectedProperties.size;
  const requiredCount = propertiesArray.filter(p => p.isRequired).length;
  const optionalCount = totalCount - requiredCount;

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header con filtros */}
      <div style={{ marginBottom: '1.5rem' }}>
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
            <span>{totalCount} total</span>
            <span style={{ color: '#34d399' }}>{requiredCount} requeridas</span>
            <span style={{ color: '#fbbf24' }}>{optionalCount} opcionales</span>
            {selectedCount > 0 && (
              <span style={{ color: '#60a5fa' }}>{selectedCount} seleccionadas</span>
            )}
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

      {/* Contenido del árbol */}
      <div style={{ 
        background: '#1e293b', 
        padding: '1rem', 
        borderRadius: '8px',
        border: '1px solid #475569',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {propertiesArray.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
            {searchText ? 'No se encontraron propiedades con ese filtro' : 'No hay propiedades para mostrar'}
          </div>
        ) : (
          <div>
            {propertiesArray.map((property, index) => renderProperty(property, index))}
            
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
                  `Total: ${totalCount} propiedades analizadas`
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyTree;