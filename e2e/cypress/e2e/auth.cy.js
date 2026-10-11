describe("auth", () => {
  it("redirects to the login page", () => {
    cy.visit("/documents");
    cy.location("pathname").should("eq", "/login");
    cy.get("footer").should("not.exist");
  });

  it("shows the home page after login", () => {
    cy.login();
    cy.visit("/");
    cy.contains("h1", "Welcome to your own reMarkable Cloud!");
    cy.get("#userMenu").should("have.text", "admin");
    cy.contains("footer", /^rmfakecloud \S+$/);
  });

  it("rejects a wrong password", () => {
    cy.login();
    cy.clearAllLocalStorage();
    cy.clearCookies();
    cy.visit("/login");
    cy.get("#username").type("admin");
    cy.get("#password").type("wrong");
    cy.contains("button", "Login").click();
    cy.contains("Can't login");
    cy.location("pathname").should("eq", "/login");
  });

  it("logs out", () => {
    cy.login();
    cy.visit("/");
    cy.get("#userMenu").click();
    cy.contains("Log out").click();
    cy.visit("/documents");
    cy.location("pathname").should("eq", "/login");
  });

  it("shows a 404 page", () => {
    cy.visit("/nope");
    cy.contains("Page Not Found.");
  });
});
