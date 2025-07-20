        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Show single tab for invited users, dual tabs for new companies */}
          <TabsList className={`grid w-full ${invitationCode ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!invitationCode && (
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Create Company
              </TabsTrigger>
            )}
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {invitationCode ? 'Complete Your Setup' : 'Join Company'}
            </TabsTrigger>
          </TabsList>

          {/* Create Company Tab - Hidden for invited users */}
          {!invitationCode && (
            <TabsContent value="create" className="space-y-4">
              {/* ... existing create company content ... */}
            </TabsContent>
          )}

          {/* Join Company Tab */}
          <TabsContent value="join" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {invitationCode ? `Join ${companyName || 'Company'}` : 'Join Existing Company'}
                </CardTitle>
                <CardDescription>
                  {invitationCode 
                    ? 'Your invitation code has been pre-filled. Click join to complete your setup.'
                    : 'Enter the invitation code provided by your company administrator.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invitation-code">Invitation Code *</Label>
                  <Input
                    id="invitation-code"
                    placeholder="ABC12345"
                    value={joinData.invitationCode}
                    onChange={(e) =>
                      setJoinData((prev) => ({
                        ...prev,
                        invitationCode: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={isSubmitting || !!invitationCode}
                    className="font-mono tracking-wider"
                  />
                  {invitationCode ? (
                    <p className="text-sm text-green-600">
                      ✅ Invitation code loaded from your invitation link
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ask your company admin for an invitation code to join their team.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleJoinCompany}
                  disabled={isSubmitting || !joinData.invitationCode}
                  className="w-full"
                >
                  {isSubmitting ? "Joining..." : `Join ${companyName || 'Company'}`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
