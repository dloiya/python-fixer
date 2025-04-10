const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Atlas connection string format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/code-editor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB Atlas: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;