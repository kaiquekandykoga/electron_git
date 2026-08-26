export function Dashboard() {
  const { node, chrome, electron } = window.api.versions;

  return (
    <>
      <h1>Electron git</h1>
      <div id="versions">
        Node {node()} · Chrome {chrome()} · Electron {electron()}
      </div>
    </>
  );
}
