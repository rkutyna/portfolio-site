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
    // Fetch data from the backend API
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`)
      .then((res) => res.json())
      .then((data) => setProjects(data));
  }, []); // The empty array ensures this effect runs only once

  return (
    <main>
      <Header />
      <Hero />
      <Projects projects={projects} />
      <Footer />
    </main>
  );
}
