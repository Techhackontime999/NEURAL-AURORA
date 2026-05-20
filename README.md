# NEURAL AURORA — The Synaptic Portfolio

**A living neural network suspended in an aurora field.** Your work isn't "displayed"—it's *fired* across synaptic pathways. Every project glows, pulses, and connects in real-time.

---

## 🧠 What is NEURAL AURORA?

This isn't a terminal, OS, 3D carousel, or HUD. It's an immersive interactive experience that transforms how your portfolio is perceived:

- **Neural Networks**: Your projects form interconnected nodes, firing with activity
- **Aurora Visualization**: Dynamic light effects create an ethereal, living aesthetic
- **Real-Time Interaction**: Hover, click, and watch the network respond
- **Synaptic Connections**: Projects link based on shared technologies, themes, and dependencies

---

## ✨ Features

### Core Experience
- 🌌 **Aurora Field Background** - Animated gradient with real-time particle effects
- 🧠 **Neural Network Graph** - Projects as nodes, technologies as connections
- ⚡ **Synaptic Firing** - Visual feedback on interaction and data flow
- 🎨 **Adaptive Themes** - Light/dark modes with custom color schemes
- 📱 **Responsive Design** - Seamless experience across all devices

### Interaction
- Hover over nodes to explore project details
- Click to expand full project information
- Drag nodes to rearrange the network
- Filter by technology or project category
- Real-time search across portfolio

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/Techhackontime999/NEURAL-AURORA.git
cd NEURAL-AURORA
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
NEURAL-AURORA/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── NeuralNetwork.jsx
│   │   ├── AuroraField.jsx
│   │   └── ProjectNode.jsx
│   ├── pages/            # Page components
│   ├── styles/           # CSS and theme files
│   ├── data/             # Portfolio data (projects, skills)
│   ├── utils/            # Helper functions
│   └── App.jsx
├── package.json
└── README.md
```

---

## 🎯 Configuration

### Adding Projects

Edit `src/data/projects.json`:

```json
{
  "id": "unique-id",
  "title": "Project Name",
  "description": "Brief description",
  "technologies": ["React", "Three.js"],
  "link": "https://project-url.com",
  "github": "https://github.com/...",
  "image": "/images/project.png"
}
```

### Customizing Colors

Edit `src/styles/theme.js` to adjust the aurora colors and neural network aesthetics.

---

## 🛠️ Tech Stack

- **Frontend**: React, Three.js
- **Styling**: CSS3, Tailwind CSS
- **Visualization**: Babylon.js or Three.js for 3D graphics
- **Build Tools**: Vite or Webpack
- **Deployment**: Vercel, GitHub Pages, Netlify

---

## 📊 Performance

- Optimized particle effects for smooth 60fps
- Lazy-loaded project data
- GPU-accelerated rendering
- Progressive enhancement for slower devices

---

## 🎨 Customization Guide

### Colors
Modify the aurora palette in `src/styles/theme.js`

### Node Behavior
Edit physics and animation settings in `src/components/NeuralNetwork.jsx`

### Connection Logic
Adjust how projects link based on shared attributes in `src/utils/networkGraph.js`

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Support & Feedback

Have suggestions? Found a bug? Open an [issue](https://github.com/Techhackontime999/NEURAL-AURORA/issues) or reach out!

---

**NEURAL AURORA** — Where your portfolio *breathes* with life. ⚡🌌
