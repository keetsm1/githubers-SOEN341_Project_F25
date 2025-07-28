export default function UploadResume({ onUpload }) {
  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    
    try {
      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData
      });
      onUpload(await response.json());
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="upload-container">
      <input 
        type="file" 
        accept=".pdf,.docx" 
        onChange={(e) => handleUpload(e.target.files[0])} 
      />
    </div>
  );
}