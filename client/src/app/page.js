"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Hero from "./components/Hero";
import Projects from "./components/Projects";
import Blogs from "./components/Blogs"

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

  const [blogs, setBlogs] = useState([]);

  // 2. Use the useEffect Hook to fetch data when the component mounts.
  useEffect(() => {
    // Fetch data from the backend API
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/blogs`)
      .then((res) => res.json())
      .then((data) => setBlogs(data));
  }, []); // The empty array ensures this effect runs only once

  return (
    <>
      <Hero />
      
      {/* Add a link to the new project page */}
      {/* <div className="container mx-auto text-right p-4 md:px-6 lg:px-12 -mb-4 -mt-4">
        <Link href="/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
            Create New Project
        </Link>
      </div> */}

      <Projects projects={projects} />
      <Blogs blogs = {blogs} />
    </>
  );
}
