const Photo = require('../models/Photo'); // Assuming Photo model exists and is similar to mongoose model

class PhotoService {
  async storeUploadedPhotos(photoFiles, requestId) {
    try {
      const photoPromises = photoFiles.map(file => {
        const newPhoto = new Photo({
          file_path: file.path,
          file_size: file.size,
          request_id: requestId,
          created_at: new Date(),
          updated_at: new Date()
        });
        return newPhoto.save();
      });

      await Promise.all(photoPromises);
      return true;
    } catch (error) {
      console.error('Error storing uploaded photos:', error);
      throw error;
    }
  }
}

module.exports = new PhotoService();
