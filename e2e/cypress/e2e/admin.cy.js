describe("admin", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/admin");
  });

  it("lists the admin user", () => {
    cy.contains("tr", "admin").should("contain", "admin");
  });

  it("creates and deletes a user", () => {
    cy.contains("button", "New User").click();
    cy.get("input[name=userid]").type("bob");
    cy.get("input[name=email]").type("bob@example.com");
    cy.get("input[name=newPassword]").type("secret");
    cy.contains("button", "Save").click();

    cy.contains("tr", "bob").should("contain", "bob@example.com");
    cy.contains("tr", "bob").contains("button", "Delete").click();
    cy.contains("tr", "bob").should("not.exist");
  });
});
