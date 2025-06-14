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
  };

  // Click en el área de drag & drop
  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
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
      >
        {isProcessing ? (
          <div className="processing-state">
            <div className="spinner"></div>
            <p>📁 Procesando archivos JSON...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <p className="upload-text">
              Arrastra archivos JSON aquí
            </p>
            <p className="upload-subtext">
              o haz clic para seleccionar archivos
            </p>
            <div className="supported-formats">
              Formatos soportados: .json
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
      </div>
      
      <div className="upload-tips">
        <h4>💡 Tips:</h4>
        <ul>
          <li>Puedes seleccionar múltiples archivos a la vez</li>
          <li>Los archivos deben ser del mismo endpoint/API</li>
          <li>JSON inválidos se marcarán con error</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploader;