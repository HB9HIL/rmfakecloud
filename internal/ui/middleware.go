package ui

import (
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/ddvk/rmfakecloud/internal/common"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

const (
	backendVersionKey string = "BackendVersion"
)

// IsAdmin checks if admin
func IsAdmin(c *gin.Context) bool {
	return c.GetBool(AdminRole)
}

func (app *ReactAppWrapper) adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !IsAdmin(c) {
			log.Warn("not admin")
			c.AbortWithStatus(http.StatusForbidden)
		}
	}
}

func (app *ReactAppWrapper) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(cookieName)
		if err == http.ErrNoCookie {
			log.Warn("missing cookie, trying headers")
			token, err = common.GetToken(c)
		}

		if err != nil {
			log.Warn("[ui-authmiddleware] token parsing, ", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or incorrect token"})
			return
		}
		claims := &WebUserClaims{}
		err = common.ClaimsFromToken(claims, token, app.cfg.JWTSecretKey)
		if err != nil {
			log.Warn("[ui-authmiddleware] token verification, ", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or incorrect token"})
			return
		}

		if !slices.Contains(claims.Audience, WebUsage) {
			log.Warn("wrong token audience: ", claims.Audience)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or incorrect token"})
			return
		}

		scopes := strings.Fields(claims.Scopes)
		c.Set(backendVersionKey, common.Sync10)
		for _, s := range scopes {
			switch s {
			case isSync15Key:
				c.Set(backendVersionKey, common.Sync15)
				break
			}
		}

		uid := common.SanitizeUid(claims.UserID)
		// the profile decides: deleted users, password changes and admin rights apply at once
		user, err := app.userStorer.GetUser(uid)
		if err != nil {
			log.Warn("[ui-authmiddleware] cannot load user, ", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or incorrect token"})
			return
		}
		var issued time.Time
		if claims.IssuedAt != nil {
			issued = claims.IssuedAt.Time
		}
		if issued.Before(user.TokensValidAfter) {
			log.Warn("[ui-authmiddleware] token issued before the last password change: ", uid)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or incorrect token"})
			return
		}
		c.Set(userIDContextKey, uid)

		brid := claims.BrowserID
		c.Set(browserIDContextKey, brid)
		if user.IsAdmin {
			c.Set(AdminRole, true)
		}
		log.Info("[ui-authmiddleware] User from token: ", uid)
		c.Next()
	}
}
