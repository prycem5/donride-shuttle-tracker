import Head from "next/head";

export default function Info() {
  return (
    <>
      <Head>
        <title>Shuttle Info • Locations & Schedule</title>
      </Head>

      <main className="bg-white text-gray-900 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center bg-black">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#C28E0E]">
            Shuttle Information
          </h1>
          <p className="mt-3 text-white text-lg">
            Pickup and drop-off locations, schedules, and everything you need to ride.
          </p>
        </div>

         {/* divider */}
        <div className="w-full border-t border-gray-200 my-12"></div>

 {/* SCHEDULE SECTION */}
        <section className="max-w-6xl mx-auto px-4 py-10 grid gap-10 md:grid-cols-2 items-center">
          <img
            src="/van.png"
            alt="Rider boarding the shuttle"
            className="rounded-xl shadow-md w-full h-auto border border-gray-200 order-last md:order-first"
          />

          <div>
            <p className="text-sm font-semibold tracking-wide text-[#C28E0E] uppercase">
              Schedule
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-2 text-black">
              The when.
            </h2>

            <p className="mt-6 text-gray-700 leading-relaxed">
              Expect pickups approximately every{" "}
              <span className="font-semibold text-[#C28E0E]">
                15–20 minutes
              </span>
              . Plan accordingly to make it to classes on time. Look for pickup
              signs around your apartment or housing complex.
            </p>

            <div className="mt-6 space-y-2 text-lg">
              <p>
                <strong className="text-[#C28E0E]">Monday–Thursday:</strong> 8 a.m.–9 p.m.
              </p>
              <p>
                <strong className="text-[#C28E0E]">Friday:</strong> 8 a.m.–1:15 p.m.
              </p>
            </div>
          </div>
        </section>

         {/* divider */}
        <div className="w-full border-t border-gray-200 my-12"></div>

        {/* LOCATIONS SECTION */}
        <section className="max-w-6xl mx-auto px-4 py-10 grid gap-10 md:grid-cols-2 items-start">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#C28E0E] uppercase">
              Pickup and drop-off locations
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-2 text-black">
              The where.
            </h2>

            <p className="mt-4 text-gray-700">
              Here are the current pickup and drop-off locations:
            </p>

            <ul className="mt-6 space-y-4 text-gray-900">
              <li className="font-semibold">
                STUDENT HOUSING
                <ul className="ml-5 mt-2 list-disc text-gray-700 space-y-1">
                  <li>Development Office</li>
                  <li>Building H Entrance</li>
                  <li>Cole Clubhouse</li>
                </ul>
              </li>

              <li className="font-semibold">
                CANTERBURY GREEN
                <ul className="ml-5 mt-2 list-disc text-gray-700 space-y-1">
                  <li>GoTech Parking Lot</li>
                  <li>City Bus Stop on Stonehedge Blvd.</li>
                  <li>Northgate near Roebuck Blvd.</li>
                  <li>Truemper Way near Mailbox</li>
                </ul>
              </li>

              <li className="font-semibold">
                DOERMER SCHOOL OF BUSINESS
                <ul className="ml-5 mt-2 list-disc text-gray-700 space-y-1">
                  <li>Main Entrance</li>
                </ul>
              </li>

              <li className="font-semibold">
                WALB STUDENT UNION
                <ul className="ml-5 mt-2 list-disc text-gray-700 space-y-1">
                  <li>Under Skybridge</li>
                </ul>
              </li>

              <li className="font-semibold">
                KETTLER
                <ul className="ml-5 mt-2 list-disc text-gray-700 space-y-1">
                  <li>Main Entrance</li>
                </ul>
              </li>

              <li className="font-semibold">
                MUSIC CENTER
                <ul className="ml-5 mt-2 list-disc text-gray-700 space-y-1">
                  <li>Main Entrance</li>
                </ul>
              </li>
            </ul>

            <a
              href="https://www.pfw.edu/sites/default/files/documents-2024/10/PFW-SLL-Shuttle-Map-with-legends-2025-PRINT.pdf"
              className="inline-block bg-black mt-8 rounded-md border border-[#C28E0E] px-5 py-3 font-semibold text-[#C28E0E] hover:bg-[#C28E0E] hover:text-black transition"
            >
              Shuttle Location Map
            </a>
          </div>

          <img
            src="/doermer.jpg"
            alt="Doermer School of Business"
            className="rounded-xl shadow-md w-full h-auto border border-gray-200"
          />
        </section>
      </main>
    </>
  );
}
