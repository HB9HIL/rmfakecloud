describe("documents", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/documents");
  });

  it("uploads, opens and deletes a pdf", () => {
    cy.get("input[type=file]").selectFile("cypress/fixtures/test.pdf", { force: true });
    cy.contains(".filelist-item", "test").click();

    cy.location("pathname").should("match", /^\/documents\/.+/);
    cy.get(".react-pdf__Page canvas").should("be.visible");
    cy.contains("Page: ").should("not.exist");

    cy.visit("/documents");
    cy.contains(".filelist-item", "test").find(".filelist-checkbox").check();
    cy.contains("button", "Delete").click();
    cy.contains(".filelist-item", "test").should("not.exist");
  });

  it("creates a folder", () => {
    cy.contains("button", "Create Folder").click();
    cy.get(".modal input").type("Projects");
    cy.contains(".modal button", "Create").click();
    cy.contains(".filelist-item", "Projects");
  });

  it("switches between list and grid", () => {
    cy.get("label[for=grid]").click();
    cy.get(".filegrid").should("exist");
    cy.get("label[for=list]").click();
    cy.get(".filelist").should("exist");
  });
});
