# PI Planner - AI-Powered Sprint Planning Tool

An intelligent Program Increment (PI) planning application that leverages AI to help teams efficiently plan and manage their sprints, epics, and user stories.

## 🚀 Features

### **Epic Management**
- Create, edit, and delete epics with detailed information
- Track epic history and revert to previous versions
- AI-powered epic refinement and generation from requirements
- Priority levels: Critical, High, Medium (default), Low
- T-shirt sizing: XS, S, M, L, XL, XXL
- Status tracking and acceptance criteria management

### **Smart Auto-Scheduling**
- AI-powered dependency analysis of backlog issues
- Automatic sprint scheduling based on:
  - Epic priority (Critical → High → Medium → Low)
  - Technical dependencies between issues
  - Configurable team velocity (default: 85 story points)
  - Sprint length (default: 2 weeks)
  - Team size (default: 5 developers)
- Automatic creation of additional sprints when needed

### **Data Management**
- **Import**: JSON, CSV, or TXT files for Requirements, Epics, and Sprints
- **Export**: Complete project data in JSON format for Jira integration
- Real-time data validation and error handling
- Firebase Firestore integration for persistent storage

### **AI Integration**
- Google Gemini AI for intelligent content generation
- Epic creation from requirements
- Content refinement and enhancement
- Dependency analysis for optimal scheduling

## 🛠️ Setup Instructions

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn package manager
- Google Gemini API key
- Firebase project (optional, for cloud storage)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pi-planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `env.template` to `.env`
   ```bash
   cp env.template .env
   ```
   
   - Edit `.env` and add your API keys:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Get Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

5. **Firebase Setup (Optional)**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Get your config values and add to `.env`

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   - Navigate to `http://localhost:5173`

## 📋 Usage Guide

### **Getting Started**

1. **Add Requirements**
   - Click "Add Requirement" in the Requirements column
   - Enter your project requirements or user stories
   - Use the "Generate Epic" button to convert requirements to epics using AI

2. **Manage Epics**
   - **Create**: Generated from requirements or added manually
   - **Edit**: Click the pencil icon to modify epic details
   - **Delete**: Click the trash icon (confirms before deletion)
   - **Refine**: Use AI to enhance epic content
   - **History**: View and revert to previous versions

3. **Issue Management**
   - Add issues to epics using the "Add Issue" button
   - Issues start in the backlog (unscheduled)
   - Drag and drop issues between sprints

### **Auto-Scheduling Workflow**

1. **Configure Settings**
   - Click "Auto Schedule" in the Sprints section
   - Set your team parameters:
     - Sprint length (weeks)
     - Team velocity (story points per sprint)
     - Number of developers

2. **AI Analysis**
   - The system analyzes all backlog issues
   - Identifies technical dependencies using AI
   - Creates an optimal scheduling plan

3. **Automatic Scheduling**
   - Issues are scheduled by epic priority (Critical first)
   - Respects technical dependencies
   - Creates new sprints automatically if needed
   - Distributes work based on team velocity

### **Data Import/Export**

#### **Import Data**
- Click "Import" button in any section header
- Supported formats:
  - **JSON**: Complete data structure
  - **CSV/TXT**: Delimited data with headers
- Data is validated before import

#### **Export Data**
- Click "Export Data" above the Sprints section
- Downloads complete project data as JSON
- Use for Jira integration or backup
- Can be re-imported later to resume work

### **Epic Priority System**

| Priority | Color | Scheduling Order |
|----------|-------|------------------|
| Critical | Bold Red | 1st |
| High | Red | 2nd |
| Medium | Yellow | 3rd (Default) |
| Low | Green | 4th |

### **T-Shirt Sizing**

| Size | Story Points | Typical Use |
|------|-------------|-------------|
| XS | 1-2 | Bug fixes, minor updates |
| S | 3-5 | Small features |
| M | 8-13 | Standard features |
| L | 21-34 | Large features |
| XL | 55-89 | Major initiatives |
| XXL | 144+ | Epic-level work |

## 🔧 Technical Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Anonymous Auth
- **AI**: Google Gemini API
- **Icons**: Lucide React

## 📁 Project Structure

```
pi-planner/
├── src/
│   ├── components/
│   │   ├── EpicCard.jsx      # Epic display and editing
│   │   ├── IssueCard.jsx     # Issue display component
│   │   └── SprintLane.jsx    # Sprint column component
│   ├── config/
│   │   └── firebase.js       # Firebase configuration
│   ├── App.jsx               # Main application component
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── public/                   # Static assets
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🚨 Troubleshooting

### **Common Issues**

1. **API Key Errors**
   - Ensure `.env` file exists and contains valid API keys
   - Restart development server after adding keys

2. **Firebase Connection Issues**
   - Check Firebase project configuration
   - Verify Firestore rules allow read/write access

3. **AI Generation Failures**
   - Check Gemini API key validity
   - Ensure stable internet connection
   - Monitor API quotas and limits

### **Error Messages**

- **"An API Key must be set"**: Add `VITE_GEMINI_API_KEY` to `.env`
- **"Service Unavailable"**: Gemini API temporary issue, try again
- **"Invalid JSON response"**: AI response parsing error, retry operation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section above
- Review console logs for detailed error messages
- Ensure all dependencies are properly installed
- Verify environment variables are correctly configured

---

**Happy Planning! 🎯**
