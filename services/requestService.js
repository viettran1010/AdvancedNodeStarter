const Request = require('../models/Request'); // Assuming the existence of Request model

class RequestService {
  async createUserRequest(userData, requestDetails) {
    try {
      // Assuming Request.create is a method to create a new record in the "requests" table
      const request = await Request.create({
        ...requestDetails,
        user_id: userData.id // Linking the request to the newly created user
      });
      return request;
    } catch (error) {
      // Handle the error appropriately
      console.error('Error creating user request:', error);
      throw error;
    }
  }
}

module.exports = new RequestService();
