// File: src/pages/Home.jsx

function Home() {
  return (
    <div>
      {" "}
      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-bold text-[hsl(var(--primary))]">
          Dashboard
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm font-light">
          Manage your invoices
        </p>
      </header>
      <main>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dashboard Card 1 */}
          <div className="p-6 h-[200px] rounded-lg border border-neutral-800 shadow-2xl bg-neutral-900">
            <h2 className="text-lg font-semibold mb-2">Recent Invoices</h2>
            <p className="text-sm font-light text-zinc-400">
              No invoices created yet
            </p>
          </div>

          {/* Dashboard Card 2 */}
          <div className="p-6 rounded-lg border border-neutral-800 shadow-2xl bg-neutral-900">
            <h2 className="text-lg font-semibold mb-2">Total Revenue</h2>
            <p className="text-sm font-light text-zinc-400">$0.00</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
