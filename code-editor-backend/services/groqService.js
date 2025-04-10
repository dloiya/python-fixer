const Groq = require("groq-sdk");

// Make sure to set GROQ_API_KEY in your .env file
async function getSuggestions(code, language, executionResult) {
  try {
    // Initialize the Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Get list of available models (optional, for future model selection)
    // const models = await groq.models.list();
    // console.log("Available models:", models.data.map(model => model.id));

    // Create chat completion
    const chatCompletion = await groq.chat.completions.create({
      model: "llama3-70b-8192", // Using LLaMa 3 70B model
      messages: [
        {
          role: "system",
          content: `You are an expert code assistant that analyzes ${language} code and provides suggestions for improvements. 
          Analyze the code and execution result provided by the user. 
          If there are errors, provide solutions. If no errors, suggest optimizations, best practices, or improvements.
          Format your response as JSON with the fields 'analysis' (string), and 'suggestions' (array of objects with 'title', 'code', and 'explanation' fields).`
        },
        {
          role: "user",
          content: `
          Language: ${language}
          
          Code:
          ${code}
          
          Execution Result:
          ${executionResult || 'No execution result provided'}
          
          Please analyze this code and provide suggestions for improvements, bug fixes, or optimizations.
          Return your response in JSON format as described.`
        }
      ],
      temperature: 0.2,
      max_tokens: 4096
    });

    // Parse the response content to extract JSON
    let responseContent = chatCompletion.choices[0].message.content;
    
    // The AI might wrap the JSON in markdown code blocks, so we need to extract it
    if (responseContent.includes('```json')) {
      responseContent = responseContent.split('```json')[1].split('```')[0].trim();
    } else if (responseContent.includes('```')) {
      responseContent = responseContent.split('```')[1].split('```')[0].trim();
    }
    
    try {
      const parsedContent = JSON.parse(responseContent);
      return {
        analysis: parsedContent.analysis || 'No analysis provided',
        suggestions: parsedContent.suggestions || []
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      
      // Fallback response if JSON parsing fails
      return {
        analysis: 'Could not parse AI analysis',
        suggestions: [
          {
            title: 'General improvement',
            code: code,
            explanation: 'Consider reviewing your code for best practices and optimizations.'
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error calling Groq API:', error.response?.data || error.message);
    throw new Error('Failed to get suggestions from Groq API');
  }
}

module.exports = {
  getSuggestions
};