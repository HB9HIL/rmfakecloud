describe("documents", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/documents");
  });

  it("uploads, opens and trashes a pdf", () => {
    cy.get("input[type=file]").selectFile("cypress/fixtures/test.pdf", { force: true });
    cy.contains(".filelist-item", "test").dblclick();

    cy.location("pathname").should("match", /^\/documents\/.+/);
    cy.get(".react-pdf__Page canvas").should("be.visible");
    cy.contains("Page: ").should("not.exist");

    cy.visit("/documents");
    cy.contains(".filelist-item", "test").rightclick();
    cy.contains("[role=menuitem]", "Move to Trash").click();
    cy.contains(".filelist-item", "test").should("not.exist");

    cy.visit("/documents/trash");
    cy.contains(".filelist-item", "test").rightclick();
    cy.contains("[role=menuitem]", "Restore").click();
    cy.contains(".filelist-item", "test").should("not.exist");
    cy.visit("/documents");
    cy.contains(".filelist-item", "test");
  });

  it("keeps the page when a document can't be rendered", () => {
    cy.get("input[type=file]").selectFile("cypress/fixtures/test.pdf", { force: true });
    cy.intercept("GET", "/ui/api/documents/*", "not a pdf");
    cy.contains(".filelist-item", "test").dblclick();
    cy.contains("Failed to load the document.");
    cy.contains("nav[aria-label=Breadcrumb] a", "My Files");
  });

  it("creates and renames a folder", () => {
    cy.contains("button", "New Folder").click();
    cy.focused().should("have.value", "New folder").type("Projects{enter}");
    cy.contains(".filelist-item", "Projects").rightclick();
    cy.contains("[role=menuitem]", "Rename").click();
    cy.focused().type("Archive{enter}");
    cy.contains(".filelist-item", "Archive");
    cy.contains(".filelist-item", "Projects").should("not.exist");
  });

  it("selects with the keyboard and moves to the trash", () => {
    cy.contains("button", "New Folder").click();
    cy.focused().type("Keyboard{enter}");
    cy.contains(".filelist-item", "Keyboard").click().should("have.attr", "aria-selected", "true");
    cy.focused().type("{del}");
    cy.contains(".filelist-item", "Keyboard").should("not.exist");
    cy.contains("button", "Undo").click();
    cy.contains(".filelist-item", "Keyboard");
  });

  it("switches between list and grid", () => {
    cy.get("label[for=grid]").click();
    cy.get(".filegrid").should("exist");
    cy.get("label[for=list]").click();
    cy.get(".filelist").should("exist");
  });
});
