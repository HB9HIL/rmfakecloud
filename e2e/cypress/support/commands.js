// The first login on an empty instance creates the admin user
Cypress.Commands.add("login", () => {
  cy.session("admin", () => {
    cy.visit("/login");
    cy.get("#username").type("admin");
    cy.get("#password").type("admin");
    cy.contains("button", "Login").click();
    cy.location("pathname").should("eq", "/documents");
  });
});
