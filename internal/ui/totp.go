package ui

import (
	"net/http"
	"time"

	"github.com/ddvk/rmfakecloud/internal/model"
	"github.com/ddvk/rmfakecloud/internal/ui/viewmodel"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

const totpLog = "[ui-totp] "

// getTOTP returns the state, and a fresh secret to enable it
func (app *ReactAppWrapper) getTOTP(c *gin.Context) {
	user, err := app.userStorer.GetUser(userID(c))
	if err != nil {
		log.Error(totpLog, err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	if user.TOTPSecret != "" {
		c.JSON(http.StatusOK, gin.H{"enabled": true})
		return
	}
	secret, err := model.NewTOTPSecret()
	if err != nil {
		log.Error(totpLog, err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"enabled": false,
		"secret":  secret,
		"uri":     model.TOTPURI(secret, user.ID),
	})
}

func (app *ReactAppWrapper) enableTOTP(c *gin.Context) {
	var form viewmodel.TOTPForm
	if err := c.ShouldBindJSON(&form); err != nil {
		badReq(c, err.Error())
		return
	}
	user, err := app.userStorer.GetUser(userID(c))
	if err != nil {
		log.Error(totpLog, err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	if user.TOTPSecret != "" {
		badReq(c, "two-factor login is already enabled")
		return
	}
	user.TOTPSecret = form.Secret
	user.TOTPLastStep = 0
	if !user.CheckTOTP(form.Code, time.Now()) {
		badReq(c, "invalid code")
		return
	}
	if err := app.userStorer.UpdateUser(user); err != nil {
		log.Error(totpLog, err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	log.Info(totpLog, "enabled for ", user.ID)
	c.Status(http.StatusOK)
}

func (app *ReactAppWrapper) disableTOTP(c *gin.Context) {
	var form viewmodel.TOTPForm
	if err := c.ShouldBindJSON(&form); err != nil {
		badReq(c, err.Error())
		return
	}
	user, err := app.userStorer.GetUser(userID(c))
	if err != nil {
		log.Error(totpLog, err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	if !user.CheckTOTP(form.Code, time.Now()) {
		badReq(c, "invalid code")
		return
	}
	user.TOTPSecret = ""
	user.TOTPLastStep = 0
	if err := app.userStorer.UpdateUser(user); err != nil {
		log.Error(totpLog, err)
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	log.Info(totpLog, "disabled for ", user.ID)
	c.Status(http.StatusOK)
}
