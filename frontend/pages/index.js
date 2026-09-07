import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded, user } = useUser();

  // Redirect logged-in users to their appropriate portal
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      const role = user.publicMetadata?.role;

      switch (role) {
        case "driver":
          router.push("/driver/page");
          break;
        case "admin":
          router.push("/admin/page");
          break;
        default:
          router.push("/student/page");
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <>
      <Head>
        <title>ShuttleApp • Purdue Fort Wayne</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Navbar />

      <section
        className="relative min-h-[60vh] flex items-center"
        aria-label="ShuttleApp landing hero"
      >
        {/* Background image */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url('/texture--mastodon.png')" }}
        />
        {/* dark overlay for contrast */}
        <div className="absolute inset-0 -z-10 bg-black/60" />

        <div className="mx-auto w-full max-w-6xl px-4 text-center text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            Your Campus Shuttle, Simplified
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-gray-200">
            A faster, smarter way to get around the Purdue Fort Wayne campus.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/sign-in"
              className="inline-block rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700 transition"
            >
              Sign In
            </a>
            <a
              href="https://www.pfw.edu/student-government/student-shuttle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl border border-white/70 px-6 py-3 font-semibold hover:bg-white/10 transition"
            >
              Learn More
            </a>
          </div>

          {/* quick trust row */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-200">
            <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
              <div className="text-2xl font-bold text-white">24/7</div>
              <div>Access</div>
            </div>
            <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
              <div className="text-2xl font-bold text-white">Live</div>
              <div>Tracking</div>
            </div>
            <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
              <div className="text-2xl font-bold text-white">Secure</div>
              <div>Login</div>
            </div>
            <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
              <div className="text-2xl font-bold text-white">PFW</div>
              <div>Focused</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-12 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            What you can do
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              title="See shuttles live"
              desc="Watch shuttle locations update in real time on the campus map."
            />
            <Feature
              title="Notify the driver you're waiting"
              desc="Make sure your driver knows you're waiting, no missed pickups."
            />
            <Feature
              title="Smart routes"
              desc="Suggested routes and ETAs so you get there on time."
            />
          </div>
        </div>
      </section>

      {/* WALMART TRIPS SECTION */}
      <section
        className="relative bg-cover bg-center text-white py-60"
        style={{ backgroundImage: "url('/walmart-trip.jpg')" }}
      >
        {/* dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <h2 className="text-yellow-400 font-bold text-lg tracking-wide uppercase">
            Walmart Trips
          </h2>
          <h3 className="text-4xl font-extrabold mt-2 mb-4">
            Get the essentials you need.
          </h3>

          <p className="text-gray-200 leading-relaxed mb-4">
            Every Friday, you can take the shuttle to Walmart for a shopping
            excursion. You must sign up in advance for these trips. The pickup
            location for both departures is Walb Student Union. If you live off
            campus, you can take a shuttle bus from your apartment complex to
            Walb Student Union prior to the Walmart pickup time.
          </p>

          <p className="text-gray-200 leading-relaxed mb-4">
            Upon arrival at Walmart, you will be allowed one hour to shop and
            meet back at the van. After the Walmart trip, the driver will drop
            you off at your housing complex (Grand at Shoaff Park, St. Joe,
            Canterbury Green, and Student Housing on the Waterfield Campus).
          </p>

          <p className="font-bold text-white">First departure</p>
          <p className="mb-3">Fridays at 1:30 p.m.</p>

          <p className="font-bold text-white">Second departure</p>
          <p className="mb-6">Fridays at 2:30 p.m.</p>

          <a
            href="https://www.signupgenius.com/go/10C0E49A9A829A0FCC52-weekly1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-yellow-500 text-black font-semibold px-6 py-3 rounded-md hover:bg-yellow-400 transition"
          >
            Sign Up
          </a>
        </div>
      </section>
    </>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 hover:shadow-md transition">
      <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
      <p className="mt-2 text-sm text-gray-600">{desc}</p>
    </div>
  );
}
