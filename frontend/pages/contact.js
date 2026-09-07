export default function Contact() {
  return (
    <main className="bg-white text-black min-h-screen">
      {/* Feedback Section */}
      <section className="bg-black text-white py-12 px-6 md:px-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Tell us what you think.</h2>
            <p className="text-gray-300 mb-4">
              Give us your opinion of the student shuttle so that we can make improvements where necessary.
            </p>
          <a
            href="https://purdue.ca1.qualtrics.com/jfe/form/SV_2bsejRCnmUP6YWW?_ga=2.98438175.1620496808.1760856445-297534646.1739397910"
            className="inline-block bg-yellow-500 text-black font-semibold px-6 py-3 rounded-md hover:bg-yellow-400 transition"
          >
            Submit Feedback
          </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-white text-center py-16 px-6">
        <p className="text-sm font-semibold text-yellow-600 uppercase">Contact Us</p>
        <h2 className="text-3xl font-bold mt-2">Have questions?</h2>
        <div className="w-16 h-1 bg-yellow-500 mx-auto my-3"></div>

        <p className="text-gray-600 mt-4 max-w-lg mx-auto leading-relaxed">
          Contact <strong>Abbey Wang</strong>, student shuttle program coordinator, at{" "}
          <a href="mailto:wangal@pfw.edu" className="font-semibold underline hover:text-yellow-600">
            wangal@pfw.edu
          </a>{" "}
          or call <span className="font-semibold">260-414-9986</span>.
        </p>
      </section>
    </main>
  );
}
