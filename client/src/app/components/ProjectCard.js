// This defines a new React component named ProjectCard.
export default function ProjectCard({ title, description }) {
    return (
      // This is the main container for the card.
      // `className` is how we add styles with Tailwind CSS.
      // - `border`: Adds a thin border around the element.
      // - `rounded-lg`: Makes the corners of the border slightly rounded (lg = large).
      // - `p-4`: Adds padding of 1rem (16px) inside the card.
      <div className="border rounded-lg p-4">
        {/* This is a placeholder for the project's title. */}
        <h3 className="text-xl font-bold">{title}</h3>
        {/* This is a placeholder for the project's description. */}
        <p className="mt-2">{description}</p>
      </div>
    );
  }