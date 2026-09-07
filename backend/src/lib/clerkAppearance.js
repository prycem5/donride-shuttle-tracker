// /lib/clerkAppearance.js (or any shared location)

// This object customizes Clerk's components to match your app's theme.
export const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(224 71.4% 4.1%)", // Corresponds to your --primary HSL value
    colorBackground: "hsl(0 0% 100%)", // Your --background
    colorText: "hsl(224 71.4% 4.1%)", // Your --foreground
    colorInputBackground: "hsl(0 0% 100%)",
    colorInputText: "hsl(224 71.4% 4.1%)",
    borderRadius: "0.75rem", // Corresponds to your --radius
  },
  elements: {
    card: {
      boxShadow: "none",
      border: "1px solid hsl(var(--border))",
      width: "100%",
      maxWidth: "450px",
    },
    headerTitle: {
      fontFamily: "var(--font-heading)",
      fontSize: "2rem",
    },
    headerSubtitle: {
      fontFamily: "var(--font-geist-sans)", // Use your body font
    },
    formButtonPrimary: {
      backgroundColor: "hsl(var(--primary))",
      "&:hover": {
        backgroundColor: "hsl(var(--primary) / 0.9)",
      },
      fontFamily: "var(--font-geist-sans)",
      fontWeight: 500,
    },
    formFieldInput: {
      borderColor: "hsl(var(--border))",
      "&:focus": {
        borderColor: "hsl(var(--primary))",
        boxShadow: "none",
      },
    },
    footerActionLink: {
      color: "hsl(var(--primary))",
      fontWeight: 500,
      "&:hover": {
        textDecoration: "underline",
      },
    },
    socialButtonsBlockButton: {
      borderColor: "hsl(var(--border))",
      "&:hover": {
        backgroundColor: "hsl(var(--muted))",
      },
    },
  },
};
