import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Mail, Lock, User, Sparkles, 
  GraduationCap, Clock, Brain, CheckCircle2
} from "lucide-react";
import logoUrl from "../../assets/logo.png";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(1, t('auth.passwordRequired')),
  });

  const signupSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(8, t('auth.passwordMin')),
    firstName: z.string().min(1, t('auth.firstNameRequired')),
    lastName: z.string().optional(),
  });

  type LoginForm = z.infer<typeof loginSchema>;
  type SignupForm = z.infer<typeof signupSchema>;

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.loginSuccessDesc'),
      });
      onClose();
      setLocation("/tutor");
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.loginFailed'),
        description: error.message || t('auth.loginFailedDesc'),
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t('auth.signupSuccess'),
        description: t('auth.signupSuccessDesc'),
      });
      onClose();
      setLocation("/tutor");
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.signupFailed'),
        description: error.message || t('auth.signupFailedDesc'),
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onSignup = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  const benefits = [
    { icon: Brain, textKey: 'auth.benefit1' },
    { icon: GraduationCap, textKey: 'auth.benefit2' },
    { icon: Clock, textKey: 'auth.benefit3' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md p-0 bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl overflow-hidden"
        aria-describedby="auth-description"
      >
        <DialogTitle className="sr-only">{t('auth.login')}</DialogTitle>
        <DialogDescription id="auth-description" className="sr-only">
          {t('auth.loginSubtitle')}
        </DialogDescription>
        
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
          
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <img src={logoUrl} alt={t('brand.logoAlt')} className="w-8 h-8" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                {t('brand.name')}
              </span>
            </div>
            
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <TabsTrigger 
                  value="login" 
                  data-testid="tab-login"
                  className="rounded-lg font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
                >
                  {t('auth.login')}
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  data-testid="tab-signup"
                  className="rounded-lg font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm"
                >
                  {t('auth.signup')}
                </TabsTrigger>
              </TabsList>
              
              <AnimatePresence mode="wait">
                <TabsContent value="login" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {t('auth.welcomeBack')}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('auth.loginSubtitle')}
                      </p>
                    </div>
                    
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.email')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder={t('auth.emailPlaceholder')}
                                    data-testid="input-email-login"
                                    className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.password')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder={t('auth.passwordPlaceholder')}
                                    data-testid="input-password-login"
                                    className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold shadow-lg shadow-primary-500/25"
                          disabled={loginMutation.isPending}
                          data-testid="button-login"
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t('auth.signingIn')}
                            </>
                          ) : (
                            t('auth.signinButton')
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                </TabsContent>
                
                <TabsContent value="signup" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {t('auth.createAccount')}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('auth.signupSubtitle')}
                      </p>
                    </div>
                    
                    <Form {...signupForm}>
                      <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={signupForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {t('auth.firstName')}
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                      {...field}
                                      placeholder={t('auth.firstNamePlaceholder')}
                                      data-testid="input-firstname"
                                      className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={signupForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {t('auth.lastName')}
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                      {...field}
                                      placeholder={t('auth.lastNamePlaceholder')}
                                      data-testid="input-lastname"
                                      className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.email')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder={t('auth.emailPlaceholder')}
                                    data-testid="input-email-signup"
                                    className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('auth.password')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="password"
                                    placeholder={t('auth.passwordPlaceholder')}
                                    data-testid="input-password-signup"
                                    className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20"
                                  />
                                </div>
                              </FormControl>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('auth.passwordHint')}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold shadow-lg shadow-primary-500/25"
                          disabled={signupMutation.isPending}
                          data-testid="button-signup"
                        >
                          {signupMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t('auth.creatingAccount')}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              {t('auth.createButton')}
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap justify-center gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>{t(benefit.textKey)}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
                {t('auth.freeForever')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
