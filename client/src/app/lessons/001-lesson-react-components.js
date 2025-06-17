// client/src/lessons/001-lesson-react-components.js

// This is a React component. It's a JavaScript function!
// By convention, component names start with a capital letter.
function Greeting() {
    // It returns JSX, which looks like HTML.
    // This JSX describes the UI for this component.
    return <h1>Hello, Roger! This is a React component.</h1>;
  }
  
  // This is another component.
  function ProjectCard() {
    const projectName = "My Awesome Portfolio";
  
    return (
      // We can use curly braces {} to embed JavaScript expressions right in our JSX!
      <div>
        <h2>{projectName}</h2>
        <p>This is where the project description will go.</p>
        <button>Learn More</button>
      </div>
    );
  }
  
  // To build a page, we would combine these components.
  // For example:
  // <Greeting />
  // <ProjectCard />
  // <ProjectCard />