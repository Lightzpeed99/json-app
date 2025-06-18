import React, { useRef, useState } from 'react';

const FileUploader = ({ onFilesLoaded }) => {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Procesar archivos seleccionados
  const processFiles = async (files) => {
    setIsProcessing(true);
    const fileArray = Array.from(files);
    const processedFiles = [];

    for (const file of fileArray) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          const content = await readFileContent(file);
          const parsedContent = JSON.parse(content);
          
          processedFiles.push({
            id: generateId(),
            name: file.name,
            content: parsedContent,
            valid: true,
            size: file.size,
            loadedAt: new Date()
          });
        } catch (error) {
          processedFiles.push({
            id: generateId(),
            name: file.name,
            content: null,
            valid: false,
            error: error.message,
            size: file.size,
            loadedAt: new Date()
          });
        }
      }
    }

    setIsProcessing(false);
    onFilesLoaded(processedFiles);
  };

  // Leer contenido del archivo
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  // Generar ID único
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Handlers para drag & drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Handler para input file
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFiles(files);
    }
    // Limpiar el input para permitir seleccionar los mismos archivos de nuevo
    e.target.value = '';
  };

  // Click en el área de drag & drop
  const handleUploadAreaClick = () => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="file-uploader-container">
      <div 
        className={`file-uploader ${isDragOver ? 'drag-over' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
        style={{
          border: `2px dashed ${isDragOver ? '#06b6d4' : '#475569'}`,
          borderRadius: '8px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          transition: 'all 0.15s ease',
          cursor: isProcessing ? 'wait' : 'pointer',
          background: isDragOver ? 
            'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(37, 99, 235, 0.1))' : 
            '#1e293b',
          position: 'relative',
          overflow: 'hidden',
          transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isDragOver ? '0 10px 25px rgba(6, 182, 212, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {isProcessing ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #475569',
              borderTop: '4px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div>
              <p style={{
                margin: '0 0 0.5rem 0',
                color: '#d97706',
                fontWeight: 600,
                fontSize: '1.1rem'
              }}>
                📁 Procesando archivos JSON...
              </p>
              <p style={{
                margin: 0,
                color: '#94a3b8',
                fontSize: '0.9rem'
              }}>
                Validando estructura y contenido
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '0.5rem',
              filter: isDragOver ? 'grayscale(0) brightness(1.2)' : 'grayscale(0.3)',
              transition: 'filter 0.15s ease',
              animation: isDragOver ? 'bounce 0.6s ease-in-out' : 'none'
            }}>
              📁
            </div>
            
            <div>
              <p style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                color: '#f8fafc',
                margin: '0 0 0.5rem 0'
              }}>
                {isDragOver ? '¡Suelta los archivos aquí!' : 'Arrastra archivos JSON aquí'}
              </p>
              <p style={{
                fontSize: '1rem',
                color: '#cbd5e1',
                margin: '0 0 1rem 0'
              }}>
                o haz clic para seleccionar archivos
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#22d3ee',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              📋 Formatos soportados: .json
            </div>

            {/* Indicadores de características */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(5, 150, 105, 0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                color: '#34d399'
              }}>
                <span>✅</span>
                <span>Múltiples archivos</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(37, 99, 235, 0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                color: '#60a5fa'
              }}>
                <span>🔍</span>
                <span>Validación automática</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(245, 158, 11, 0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                color: '#fbbf24'
              }}>
                <span>⚡</span>
                <span>Procesamiento rápido</span>
              </div>
            </div>
          </div>
        )}
        
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept=".json,application/json"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {/* Efecto de partículas cuando se hace drag over */}
        {isDragOver && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
            animation: 'pulse 1s ease-in-out infinite'
          }} />
        )}
      </div>
      
      {/* Tips simplificados para modal */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#334155',
        borderRadius: '8px',
        border: '1px solid #475569'
      }}>
        <h4 style={{
          margin: '0 0 0.75rem 0',
          color: '#f8fafc',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          💡 Consejos para mejores resultados
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.5rem',
            background: '#1e293b',
            borderRadius: '6px',
            border: '1px solid #475569'
          }}>
            <span style={{ color: '#34d399', fontSize: '1rem' }}>📊</span>
            <div>
              <div style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 500 }}>
                Mismo endpoint
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
                Los archivos deben ser del mismo API/endpoint
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.5rem',
            background: '#1e293b',
            borderRadius: '6px',
            border: '1px solid #475569'
          }}>
            <span style={{ color: '#60a5fa', fontSize: '1rem' }}>🔢</span>
            <div>
              <div style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 500 }}>
                Múltiples muestras
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
                Más archivos = mejor análisis de estructuras
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            padding: '0.5rem',
            background: '#1e293b',
            borderRadius: '6px',
            border: '1px solid #475569'
          }}>
            <span style={{ color: '#fbbf24', fontSize: '1rem' }}>⚠️</span>
            <div>
              <div style={{ color: '#f8fafc', fontSize: '0.8rem', fontWeight: 500 }}>
                JSON válidos
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
                Archivos inválidos se marcarán con error
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de animación inline */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default FileUploader;