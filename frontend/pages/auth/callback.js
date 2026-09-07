import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

export default function AuthCallback() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    // Get role from public metadata
    const role = user.publicMetadata?.role;

    // Redirect based on role
    switch (role) {
      case "driver":
        router.replace("/driver/page");
        break;
      case "admin":
        router.replace("/admin");
        break;
      default:
        // Default to student/page for regular users
        router.replace("/student/page");
    }
  }, [isLoaded, user, router]);

  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p style={styles.text}>Redirecting...</p>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    gap: "1rem",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  text: {
    color: "#6b7280",
    fontSize: "0.875rem",
  },
};
