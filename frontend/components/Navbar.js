import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const [userRole, setUserRole] = useState(null);
  const [isStudent, setIsStudent] = useState(false);
  const [studentUser, setStudentUser] = useState(null);

  // Check for student JWT authentication
  useEffect(() => {
    const checkStudentAuth = () => {
      const studentToken = localStorage.getItem('student_token');
      const studentData = localStorage.getItem('student_user');

      if (studentToken && studentData) {
        setIsStudent(true);
        setStudentUser(JSON.parse(studentData));
      } else {
        setIsStudent(false);
        setStudentUser(null);
      }
    };

    checkStudentAuth();
    // Listen for storage changes (login/logout events)
    window.addEventListener('storage', checkStudentAuth);

    // Also check on route changes
    const handleRouteChange = () => {
      checkStudentAuth();
    };

    router.events?.on('routeChangeComplete', handleRouteChange);

    return () => {
      window.removeEventListener('storage', checkStudentAuth);
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // Fetch driver role from Clerk
  useEffect(() => {
    const fetchUserRole = async () => {
      if (isSignedIn && user) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.roles || []);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [isSignedIn, user]);

  const isDriver = userRole?.includes('driver');
  const isAuthenticated = isSignedIn || isStudent;

  const handleStudentSignOut = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    setIsStudent(false);
    setStudentUser(null);
    router.push('/');
  };

  return (
    <nav className="bg-white text-black sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* logo */}
        <div className="flex items-center">
          <img
            src="/pfw-logo.png"
            alt="PFW Logo"
            className="h-12 w-auto"
          />
          <span className="ml-3 font-bold text-lg">
            PFW Shuttle Tracker
          </span>
        </div>

        {/* desktop menu */}
        <div className="hidden md:flex items-center space-x-6">
          {!isAuthenticated && <a href="/" className="hover:text-yellow-500">Home</a>}

          {isDriver && (
            <a href="/driver_route_select" className="hover:text-yellow-500">Driver Route Select</a>
          )}

          {isStudent && (
            <a href="/live" className="hover:text-yellow-500">Live Map</a>
          )}

          <a href="/info" className="hover:text-yellow-500">Info</a>
          <a href="/contact" className="hover:text-yellow-500">Contact</a>

          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : isStudent ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{studentUser?.name || studentUser?.email}</span>
              <button
                onClick={handleStudentSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>

        {/* mbile hamburger */}
        <button
          className="md:hidden text-black focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* mobile dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white text-center py-2 space-y-2 border-t border-gray-200">
          {!isAuthenticated && <a href="/" className="block hover:text-yellow-500">Home</a>}

          {isDriver && (
            <a href="/driver_route_select" className="block hover:text-yellow-500">Driver Route Select</a>
          )}

          {isStudent && (
            <a href="/live" className="block hover:text-yellow-500">Live Map</a>
          )}

          <a href="/info" className="block hover:text-yellow-500">Info</a>
          <a href="/contact" className="block hover:text-yellow-500">Contact</a>

          {(isSignedIn || isStudent) && (
            <div className="flex justify-center pt-2">
              {isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-gray-600">{studentUser?.name || studentUser?.email}</span>
                  <button
                    onClick={handleStudentSignOut}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
