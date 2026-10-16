package ui

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// files of ui/public, served from the root
var rootFiles = []string{
	"favicon.ico",
	"robots.txt",
	"manifest.json",
	"sw.js",
	"icon-192.png",
	"icon-512.png",
	"apple-touch-icon.png",
}

func cacheControl(value string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", value)
	}
}

// RegisterRoutes the apps routes
func (app *ReactAppWrapper) RegisterRoutes(router *gin.Engine) {
	// the build hashes the asset names
	router.Group(app.prefix, cacheControl("public, max-age=31536000, immutable")).StaticFS("/", app)

	for _, f := range rootFiles {
		router.GET("/"+f, cacheControl("no-cache"), func(c *gin.Context) {
			c.FileFromFS("/"+f, app.fs)
		})
	}

	//hack for index.html
	router.NoRoute(func(c *gin.Context) {
		uri := c.Request.RequestURI
		log.Info(uri)
		if strings.HasPrefix(uri, "/api") ||
			strings.HasPrefix(uri, "/ui/api") ||
			strings.HasPrefix(uri, app.prefix) ||
			c.Request.Method != http.MethodGet {

			// a missing asset may come back with a rollback
			c.Writer.Header().Del("Cache-Control")
			c.AbortWithStatus(http.StatusNotFound)
			return
		}

		c.Header("Cache-Control", "no-cache")
		c.FileFromFS(indexReplacement, app)
	})

	r := router.Group("/ui/api")
	r.POST("register", app.register)
	r.POST("login", app.login)
	r.GET("logout", func(c *gin.Context) {
		c.SetCookie(cookieName, "", -1, "/", "", app.cfg.HTTPSCookie, true)
		c.Status(http.StatusOK)
	})
	//with authentication
	auth := r.Group("")
	auth.Use(app.authMiddleware())
	auth.HEAD("/", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	auth.GET("sync", func(c *gin.Context) {
		uid := userID(c)
		br := c.GetString(browserIDContextKey)
		log.Info("browser", br)
		app.h.NotifySync(uid, br)
	})

	auth.GET("events", app.events)
	auth.GET("newcode", app.newCode)
	auth.GET("version", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"version": app.cfg.Version})
	})

	// passcode (PIN) reset approval
	auth.GET("passcode/resets", app.listPasscodeResets)
	auth.POST("passcode/resets/:uuid/approve", app.approvePasscodeReset)
	auth.DELETE("passcode/resets/:uuid", app.dismissPasscodeReset)

	auth.POST("profile", app.changePassword)
	auth.GET("profile/totp", app.getTOTP)
	auth.POST("profile/totp", app.enableTOTP)
	auth.POST("profile/totp/disable", app.disableTOTP)

	auth.GET("documents", app.listDocuments)
	auth.GET("documents/:docid", app.getDocument)
	auth.POST("documents/upload", app.createDocument)

	//move, rename
	auth.DELETE("documents/:docid", app.deleteDocument)
	auth.PUT("documents", app.updateDocument)
	auth.POST("folders", app.createFolder)
	auth.GET("documents/:docid/metadata", app.getDocumentMetadata)

	// integrations
	auth.GET("integrations", app.listIntegrations)
	auth.POST("integrations", app.createIntegration)
	auth.GET("integrations/:intid", app.getIntegration)
	auth.PUT("integrations/:intid", app.updateIntegration)
	auth.DELETE("integrations/:intid", app.deleteIntegration)

	auth.GET("integrations/:intid/explore/*path", app.exploreIntegration)
	auth.GET("integrations/:intid/metadata/*path", app.getMetadataIntegration)
	auth.GET("integrations/:intid/download/*path", app.downloadThroughIntegration)

	ss := auth.Group("screenshare")
	ss.GET("room", app.screenshareJoinActive)
	ss.GET("room/:roomId", app.screenshareGetRoom)
	ss.GET("offer", app.screenshareGetOffer)
	ss.POST("room/:roomId/answer", app.screenshareSendAnswer)
	ss.DELETE("room/:roomId", app.screenshareDeleteRoom)

	//admin
	admin := auth.Group("")
	admin.Use(app.adminMiddleware())
	admin.GET("users/:userid", app.getUser)
	admin.DELETE("users/:userid", app.deleteUser)
	admin.PUT("users", app.updateUser)
	admin.POST("users", app.createUser)
	admin.GET("users", app.getAppUsers)
}
