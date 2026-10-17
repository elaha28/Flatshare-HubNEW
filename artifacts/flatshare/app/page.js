import Hub from "../components/Hub.jsx";

export default function Page() {
  return (
    <main className="root-main">
      <header className="page-heading">
        <h1>Pact</h1>
        <p>Shared bills and house admin, without the awkward chats.</p>
      </header>
      <Hub />
    </main>
  );
}
