// two-factor login for a separate user, the admin session stays without it
const loginForm = () => {
  cy.visit("/login");
  cy.get("#username").type("carol");
  cy.get("#password").type("secret");
  cy.contains("button", "Login").click();
};

describe("totp", () => {
  it("enables, requires and disables the code", () => {
    cy.login();
    cy.visit("/admin");
    cy.contains("button", "New User").click();
    cy.get("input[name=userid]").type("carol");
    cy.get("input[name=email]").type("carol@example.com");
    cy.get("input[name=newPassword]").type("secret");
    cy.contains("button", "Save").click();
    cy.contains("tr", "carol");

    cy.clearAllLocalStorage();
    cy.clearCookies();
    loginForm();
    cy.location("pathname").should("eq", "/documents");

    // each code needs a newer time step than the one before (replay protection)
    cy.visit("/profile");
    cy.get(".font-monospace").invoke("text").then((secret) => {
      cy.task("totp", { secret, offset: -1 }).then((code) => {
        cy.get("input[name=code]").type(code);
      });
      cy.contains("button", "Enable").click();
      cy.contains("button", "Disable");

      cy.get("#userMenu").click();
      cy.contains("Log out").click();
      loginForm();
      cy.get("#code").type("000000");
      cy.contains("button", "Login").click();
      cy.contains("Invalid code");
      cy.location("pathname").should("eq", "/login");

      cy.task("totp", { secret, offset: 0 }).then((code) => {
        cy.get("#code").clear().type(code);
      });
      cy.contains("button", "Login").click();
      cy.location("pathname").should("eq", "/documents");

      cy.visit("/profile");
      cy.task("totp", { secret, offset: 1 }).then((code) => {
        cy.get("input[name=code]").type(code);
      });
      cy.contains("button", "Disable").click();
      cy.contains("button", "Enable");
    });

    cy.login();
    cy.visit("/admin");
    cy.contains("tr", "carol").contains("button", "Delete").click();
    cy.contains("tr", "carol").should("not.exist");
  });
});
