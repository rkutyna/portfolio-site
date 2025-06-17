"use client";

import { useState, useEffect } from 'react';
import Header from "./components/Header";
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Footer from "./components/Footer";

export default function Home() {
  // 1. Set up a state variable to store our projects.
  // `useState([])` initializes the `projects` state with an empty array.
  // `projects` is the variable holding the current state.
  // `setProjects` is the function we use to update the state.
  const [projects, setProjects] = useState([]);

  // 2. Use the useEffect Hook to fetch data when the component mounts.
  useEffect(() => {
    // The function inside useEffect is the "effect" we want to run.
    const fetchProjects = async () => {
      try {
        // We use the browser's built-in `fetch` API to make a request to our backend.
        const response = await fetch('http://localhost:3001/api/projects');
        // We convert the response body to JSON.
        const data = await response.json();
        // We update our component's state with the data from the server.
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects(); // We call the function to run it.

  // The empty array `[]` as the second argument means this effect will only
  // run ONCE, right after the component is first rendered. 
  }, []);

  return (
    <main>
      <Header />
      <Hero />
      <Projects projects={projects} />
      <Footer />
    </main>
  );
}
