export const PORTFOLIO_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_personal_info",
      description: "Get personal info / bio / about me section",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_personal_info",
      description: "Update personal info (name, title, tagline, bio, avatar, resume)",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name" },
          title: { type: "string", description: "Professional title/role" },
          tagline: { type: "string", description: "Short tagline" },
          bio: { type: "string", description: "About / biography text" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_skills",
      description: "List all skills with their levels and categories",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_skill",
      description: "Add a new skill",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Skill name" },
          level: { type: "number", description: "Proficiency level 0-100" },
          category: { type: "string", description: "Category (frontend, backend, language, devops, design, other)" },
        },
        required: ["name", "level", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_skill",
      description: "Update an existing skill by name",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Current skill name" },
          new_name: { type: "string", description: "New name (optional)" },
          level: { type: "number", description: "New proficiency level 0-100 (optional)" },
          category: { type: "string", description: "New category (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_skill",
      description: "Delete a skill by name",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Skill name to delete" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "List all portfolio projects",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new portfolio project",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Project title" },
          description: { type: "string", description: "Project description" },
          technologies: { type: "string", description: "Comma-separated list of technologies used" },
          github: { type: "string", description: "GitHub URL (optional)" },
          link: { type: "string", description: "Live demo URL (optional)" },
        },
        required: ["title", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Update a project by title",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Current project title" },
          new_title: { type: "string", description: "New title (optional)" },
          description: { type: "string", description: "New description (optional)" },
          technologies: { type: "string", description: "Comma-separated technologies (optional)" },
          github: { type: "string", description: "GitHub URL (optional)" },
          link: { type: "string", description: "Live URL (optional)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description: "Delete a project by title",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Project title to delete" } },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_education",
      description: "List all education entries",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_education",
      description: "Add a new education entry",
      parameters: {
        type: "object",
        properties: {
          degree: { type: "string", description: "Degree name" },
          school: { type: "string", description: "School/institution name" },
          year: { type: "string", description: "Year or date range" },
          description: { type: "string", description: "Description (optional)" },
        },
        required: ["degree", "school", "year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_education",
      description: "Delete an education entry by degree name",
      parameters: {
        type: "object",
        properties: { degree: { type: "string", description: "Degree name to delete" } },
        required: ["degree"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_experience",
      description: "List all work experience entries",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_experience",
      description: "Add a new work experience entry",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", description: "Job role/title" },
          company: { type: "string", description: "Company name" },
          year: { type: "string", description: "Year or date range" },
          description: { type: "string", description: "Job description (optional)" },
        },
        required: ["role", "company", "year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_experience",
      description: "Delete an experience entry by role and company",
      parameters: {
        type: "object",
        properties: {
          role: { type: "string", description: "Job role" },
          company: { type: "string", description: "Company name" },
        },
        required: ["role", "company"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_blog_posts",
      description: "List all blog posts",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_blog_post",
      description: "Create a new blog post with AI-researched content on any topic. Uses internet knowledge to generate a full article.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Blog post title" },
          topic: { type: "string", description: "The topic to research and write about" },
        },
        required: ["title", "topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_services",
      description: "List all services offered",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_social_links",
      description: "List all social media/profile links",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_reviews",
      description: "List all client reviews/testimonials",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_contact_messages",
      description: "List recent contact form messages",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_case_studies",
      description: "List all case studies",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_case_study",
      description: "Create a new case study with AI-researched content. Generates a full case study with title, description, outcome, content, technologies, and slug.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Case study title" },
          topic: { type: "string", description: "The topic/subject of the case study" },
        },
        required: ["title", "topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description: "Get portfolio dashboard statistics (skills count, projects, blog posts, etc.)",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "reply",
      description: "Respond to the user with a friendly text message for general chat",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "The response text" } },
        required: ["text"],
      },
    },
  },
]
