// the same app on a phone, below the md breakpoint
describe("mobile", () => {
  beforeEach(() => {
    cy.viewport("iphone-x");
    cy.login();
  });

  it("collapses the navigation", () => {
    cy.visit("/");
    cy.contains(".nav-link", "Documents").should("not.be.visible");
    cy.get(".navbar-toggler").click();
    cy.contains(".nav-link", "Documents").click();

    cy.location("pathname").should("eq", "/documents");
    cy.contains(".nav-link", "Documents").should("not.be.visible");
  });

  it("opens the document tree from the side", () => {
    cy.visit("/documents");
    cy.get(".offcanvas-md").should("not.be.visible");
    cy.contains("button", "Folders").click();
    cy.get(".offcanvas-md").should("be.visible");
    cy.get(".offcanvas-md").contains("[role=treeitem]", "My Files").click();
    cy.get(".offcanvas-md").should("not.be.visible");

    cy.get("input[type=file]").selectFile("cypress/fixtures/test.pdf", { force: true });
    cy.contains(".filelist-item", "test").click();
    cy.get(".react-pdf__Page canvas").should("be.visible");

    cy.visit("/documents");
    cy.contains(".filelist-item", "test").find(".filelist-checkbox").check();
    cy.contains("button", "Delete").click();
    cy.contains(".filelist-item", "test").should("not.exist");
  });

  it("has no horizontal overflow", () => {
    const pages = [
      ["/", "h1"],
      ["/integrations", "table"],
      ["/admin", "table"],
      ["/connect", "h1"],
      ["/profile", "form"],
    ];
    for (const [path, ready] of pages) {
      cy.visit(path);
      cy.get(ready).should("be.visible");
      cy.get(".app-main").should(($el) => {
        expect($el[0].scrollWidth, path).to.be.at.most($el[0].clientWidth);
      });
      cy.document().should((doc) => {
        expect(doc.documentElement.scrollWidth, path).to.be.at.most(doc.documentElement.clientWidth);
      });
    }
  });
});
